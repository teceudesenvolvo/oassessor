import { collection, doc, runTransaction } from 'firebase/firestore';
import { firestore } from '../firebaseConfig';

const dateToWeekday = (date) => new Date(`${date}T12:00:00`).getDay();
const SLOT_LOCK_GRANULARITY = 15;
const asMinutes = (time) => {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  return hours * 60 + minutes;
};
const asTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const lockId = (adminId, date, serviceId, time, seat) => `${adminId}_${date}_${serviceId}_${time.replace(':', '')}_${seat}`;
const dailyLockId = (adminId, date, seat) => `${adminId}_${date}_daily_${seat}`;

export const getAppointmentTimes = (settings, service, date, heldSlots = []) => {
  if (!settings?.enabled || !service?.active || !date) return [];
  const day = settings.weeklySchedule?.[dateToWeekday(date)];
  if (!day?.enabled || (settings.holidays || []).some((holiday) => holiday.date === date)) return [];
  const start = asMinutes(day.startTime);
  const end = asMinutes(day.endTime);
  const duration = Math.min(240, Math.max(15, Number(service.durationMinutes) || 30));
  const interval = [15, 30, 60].includes(Number(settings.slotIntervalMinutes)) ? Number(settings.slotIntervalMinutes) : 30;
  const capacity = Math.min(10, Math.max(1, Number(service.capacityPerSlot || settings.defaultCapacity) || 1));
  const dailyCapacity = Math.min(100, Math.max(1, Number(settings.dailyCapacity) || 30));
  if (heldSlots.filter((slot) => slot.slotType === 'daily' && slot.slotDate === date).length >= dailyCapacity) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(`${date}T12:00:00`);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + Math.min(365, Math.max(1, Number(settings.advanceDays) || 60)));
    const current = new Date();
    const isToday = localDateString(current) === date;
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    if (selectedDate < today || selectedDate > maxDate) return [];
  const times = [];
  for (let minute = start; minute + duration <= end; minute += interval) {
    const blocks = [];
    for (let cursor = Math.floor(minute / SLOT_LOCK_GRANULARITY) * SLOT_LOCK_GRANULARITY; cursor < minute + duration; cursor += SLOT_LOCK_GRANULARITY) blocks.push(asTime(cursor));
    const availableSeat = Array.from({ length: capacity }, (_, seat) => seat).some((seat) =>
      blocks.every((blockTime) => !heldSlots.some((slot) => slot.serviceId === service.id
        && slot.slotDate === date && slot.slotTime === blockTime && slot.seat === seat))
    );
    if (availableSeat && (!isToday || minute > currentMinutes)) times.push(asTime(minute));
  }
  return times;
};

const localDateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export async function reservePublicAppointment({ profileSlug, adminId, serviceId, date, time, citizen }) {
  const bookingRef = doc(collection(firestore, 'publicAppointments'));
  return runTransaction(firestore, async (transaction) => {
    const profileRef = doc(firestore, 'publicProfiles', profileSlug);
    const settingsRef = doc(firestore, 'publicAppointmentSettings', adminId);
    const [profileSnapshot, settingsSnapshot] = await Promise.all([transaction.get(profileRef), transaction.get(settingsRef)]);
    if (!profileSnapshot.exists() || !settingsSnapshot.exists()) throw new Error('Agendamento indisponível.');
    const profile = profileSnapshot.data();
    const settings = settingsSnapshot.data();
    if (profile.enabled !== true || profile.userId !== adminId || settings.enabled !== true) throw new Error('Agendamento indisponível.');
    const service = (settings.services || []).find((item) => item.id === serviceId && item.active);
    if (!service) throw new Error('Este serviço não está disponível.');
    const day = settings.weeklySchedule?.[dateToWeekday(date)];
    if (!day?.enabled || (settings.holidays || []).some((holiday) => holiday.date === date)) throw new Error('Não há atendimento nesta data.');
    const start = asMinutes(day.startTime);
    const end = asMinutes(day.endTime);
    const duration = Math.min(240, Math.max(15, Number(service.durationMinutes) || 30));
    const interval = [15, 30, 60].includes(Number(settings.slotIntervalMinutes)) ? Number(settings.slotIntervalMinutes) : 30;
    const selected = asMinutes(time);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(`${date}T12:00:00`);
    const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + Math.min(365, Math.max(1, Number(settings.advanceDays) || 60)));
    const current = new Date();
    const isToday = localDateString(current) === date;
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    if (selectedDate < today || selectedDate > maxDate || (isToday && selected <= currentMinutes) || selected < start || selected + duration > end || (selected - start) % interval !== 0) {
      throw new Error('Horário indisponível. Escolha outra opção.');
    }
    const capacity = Math.min(10, Math.max(1, Number(service.capacityPerSlot || settings.defaultCapacity) || 1));
    const dailyCapacity = Math.min(100, Math.max(1, Number(settings.dailyCapacity) || 30));
    const dailyRefs = Array.from({ length: dailyCapacity }, (_, seat) => doc(firestore, 'publicAppointmentSlots', dailyLockId(adminId, date, seat)));
    const dailySnapshots = await Promise.all(dailyRefs.map((slotRef) => transaction.get(slotRef)));
    const availableDailyIndex = dailySnapshots.findIndex((snapshot) => !snapshot.exists());
    if (availableDailyIndex < 0) throw new Error('As vagas deste dia foram preenchidas. Escolha outra data.');
    const blocks = [];
    for (let cursor = Math.floor(selected / SLOT_LOCK_GRANULARITY) * SLOT_LOCK_GRANULARITY; cursor < selected + duration; cursor += SLOT_LOCK_GRANULARITY) blocks.push(asTime(cursor));
    let locks = [];
    let reservedSeat = -1;
    for (let seat = 0; seat < capacity; seat += 1) {
      const refs = blocks.map((blockTime) => doc(firestore, 'publicAppointmentSlots', lockId(adminId, date, serviceId, blockTime, seat)));
      const snapshots = await Promise.all(refs.map((slotRef) => transaction.get(slotRef)));
      if (snapshots.some((snapshot) => snapshot.exists())) continue;
      locks = refs;
      reservedSeat = seat;
      break;
    }
    if (!locks.length) throw new Error('Este horário acabou de ser reservado. Escolha outro.');
    const now = new Date().toISOString();
    const dailyRef = dailyRefs[availableDailyIndex];
    const slotIds = [dailyRef.id, ...locks.map((slotRef) => slotRef.id)];
    transaction.set(bookingRef, {
      adminId, profileSlug, serviceId, serviceName: service.name, serviceDurationMinutes: duration,
      appointmentDate: date, appointmentTime: time, citizenName: citizen.name.trim(),
      citizenPhone: citizen.phone.trim(), citizenEmail: (citizen.email || '').trim(),
      notes: (citizen.notes || '').trim(), status: 'requested', slotIds, createdAt: now, updatedAt: now,
      origin: 'public_profile'
    });
    locks.forEach((slotRef) => {
      const parts = slotRef.id.split('_');
      const compactTime = parts[parts.length - 2];
      transaction.set(slotRef, {
        adminId, profileSlug, appointmentId: bookingRef.id, serviceId, slotDate: date,
        slotTime: `${compactTime.slice(0, 2)}:${compactTime.slice(2)}`, slotType: 'time', seat: reservedSeat, createdAt: now, origin: 'public_profile'
      });
    });
    transaction.set(dailyRef, {
      adminId, profileSlug, appointmentId: bookingRef.id, serviceId, slotDate: date,
      slotTime: '00:00', seat: availableDailyIndex, slotType: 'daily', createdAt: now, origin: 'public_profile'
    });
    return { id: bookingRef.id, confirmationCode: bookingRef.id.slice(0, 8).toUpperCase() };
  });
}

export async function cancelPublicAppointment(appointmentId) {
  const appointmentRef = doc(firestore, 'publicAppointments', appointmentId);
  return runTransaction(firestore, async (transaction) => {
    const appointmentSnapshot = await transaction.get(appointmentRef);
    if (!appointmentSnapshot.exists()) return;
    const appointment = appointmentSnapshot.data();
    const slotRefs = (appointment.slotIds || []).map((id) => doc(firestore, 'publicAppointmentSlots', id));
    const slotSnapshots = await Promise.all(slotRefs.map((slotRef) => transaction.get(slotRef)));
    transaction.update(appointmentRef, { status: 'cancelled', updatedAt: new Date().toISOString() });
    slotSnapshots.forEach((snapshot, index) => {
      if (snapshot.exists() && snapshot.data().appointmentId === appointmentId) transaction.delete(slotRefs[index]);
    });
  });
}
