const storageKey = 'serena-appointments-v2';
let appointments = JSON.parse(localStorage.getItem(storageKey) || '[]');
let selectedDate = new Date();
let activeAppointment = null;
let editingAppointment = null;
const daysGrid = document.querySelector('#days-grid');
const calendarHead = document.querySelector('#calendar-head');
const modal = document.querySelector('#modal');
const detailsModal = document.querySelector('#details-modal');
const allAppointmentsModal = document.querySelector('#all-appointments-modal');
const form = document.querySelector('#appointment-form');
const datePicker = document.querySelector('#date-picker');
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

function toIso(date) { return date.toISOString().slice(0, 10); }
function startOfWeek(date) { const result = new Date(date); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); result.setHours(0, 0, 0, 0); return result; }
function setSelectedDate(date) { selectedDate = new Date(date); datePicker.value = toIso(selectedDate); renderCalendar(); }

function renderCalendar() {
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const mobileDayView = window.matchMedia('(max-width: 680px)').matches;
  document.querySelector('#current-week').innerHTML = `${dateFormatter.format(weekStart)} — ${dateFormatter.format(weekEnd)} <span>⌄</span>`;
  document.querySelector('#heading-date').textContent = `SEMANA DEL ${dateFormatter.format(weekStart).toUpperCase()}`;
  calendarHead.innerHTML = '<div class="timezone">GMT+1 <span>⌄</span></div>';
  const visibleDays = mobileDayView ? [selectedDate] : Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart); day.setDate(weekStart.getDate() + index); return day;
  });
  visibleDays.forEach((day) => {
    const head = document.createElement('div');
    head.className = `day-head${toIso(day) === toIso(new Date()) ? ' today' : ''}`;
    head.innerHTML = `<span>${day.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span><strong>${day.getDate()}</strong>`;
    calendarHead.appendChild(head);
  });
  renderAppointments(weekStart);
}

function renderAppointments(weekStart = startOfWeek(selectedDate)) {
  daysGrid.querySelectorAll('.appointment').forEach((item) => item.remove());
  const mobileDayView = window.matchMedia('(max-width: 680px)').matches;
  appointments.filter((appointment) => {
    const date = new Date(`${appointment.date}T00:00:00`);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    return mobileDayView ? appointment.date === toIso(selectedDate) : date >= weekStart && date < weekEnd;
  }).forEach((appointment) => {
    const [hours, minutes] = appointment.time.split(':').map(Number);
    const top = ((hours - 8) * 60 + minutes);
    const day = new Date(`${appointment.date}T00:00:00`);
    const dayIndex = mobileDayView ? 0 : Math.round((day - weekStart) / 86400000);
    const card = document.createElement('div');
    card.className = `appointment ${appointment.type}`;
    card.style.cssText = mobileDayView
      ? `top:${top}px;height:${appointment.duration}px;left:4px;width:calc(100% - 8px)`
      : `top:${top}px;height:${appointment.duration}px;left:calc(${dayIndex * 14.2857}% + 4px);width:calc(14.2857% - 8px)`;
    card.innerHTML = `<strong>${appointment.time} · ${appointment.client}</strong><span>${appointment.service}</span><small>${appointment.duration} min</small>`;
    card.title = `${appointment.client}: ${appointment.service}`;
    card.addEventListener('click', () => showAppointmentDetails(appointment));
    daysGrid.appendChild(card);
  });
  document.querySelector('#week-total').textContent = appointments.filter((appointment) => appointment.date >= toIso(weekStart) && appointment.date <= toIso(new Date(weekStart.getTime() + 6 * 86400000))).length;
}

function toggleModal(open) {
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
  if (open) form.elements.client.focus();
}

function openAppointmentForm(appointment = null) {
  editingAppointment = appointment;
  form.reset();
  form.elements.date.value = appointment?.date || toIso(selectedDate);
  form.elements.client.value = appointment?.client || '';
  form.elements.time.value = appointment?.time || '10:00';
  form.elements.note.value = appointment?.note || '';
  form.querySelectorAll('input[name="services"]').forEach((input) => {
    input.checked = Boolean(appointment?.services?.some((service) => service.name === input.dataset.service && service.duration === Number(input.dataset.duration)));
    input.setCustomValidity('');
  });
  document.querySelector('#appointment-form .eyebrow').textContent = appointment ? 'EDITAR RESERVA' : 'NUEVA RESERVA';
  document.querySelector('#appointment-form h2').textContent = appointment ? 'Editar cita' : 'Crear una cita';
  document.querySelector('#appointment-form .save-button').textContent = appointment ? 'Guardar cambios' : 'Guardar cita';
  updateServiceTotal();
  toggleModal(true);
}

function getSelectedServices() {
  return [...form.querySelectorAll('input[name="services"]:checked')].map((input) => ({
    name: input.dataset.service,
    duration: Number(input.dataset.duration),
    price: Number(input.dataset.price)
  }));
}

function updateServiceTotal() {
  const services = getSelectedServices();
  const totalDuration = services.reduce((total, service) => total + service.duration, 0);
  const totalPrice = services.reduce((total, service) => total + service.price, 0);
  document.querySelector('#service-total').textContent = services.length
    ? `${services.length} masaje${services.length > 1 ? 's' : ''} · ${totalDuration} min · $${totalPrice.toLocaleString('es-MX')}`
    : 'Selecciona al menos un masaje';
}

function showAppointmentDetails(appointment) {
  activeAppointment = appointment;
  document.querySelector('#details-client').textContent = appointment.client;
  document.querySelector('#details-service').textContent = appointment.service;
  document.querySelector('#details-date').textContent = dateFormatter.format(new Date(`${appointment.date}T00:00:00`));
  document.querySelector('#details-time').textContent = appointment.time;
  document.querySelector('#details-duration').textContent = `${appointment.duration} minutos`;
  document.querySelector('#details-price').textContent = appointment.price ? `$${appointment.price.toLocaleString('es-MX')}` : 'No registrado';
  document.querySelector('#details-note').textContent = appointment.note || 'Sin nota añadida';
  detailsModal.classList.add('open');
  detailsModal.setAttribute('aria-hidden', 'false');
}

const editAppointmentButton = document.createElement('button');
editAppointmentButton.type = 'button';
editAppointmentButton.className = 'edit-details-button';
editAppointmentButton.textContent = 'Editar cita';
document.querySelector('.appointment-details').insertBefore(editAppointmentButton, document.querySelector('#delete-details'));
editAppointmentButton.addEventListener('click', () => {
  const appointment = activeAppointment;
  closeDetails();
  openAppointmentForm(appointment);
});

function closeDetails() { detailsModal.classList.remove('open'); detailsModal.setAttribute('aria-hidden', 'true'); }

function renderAllAppointments() {
  const list = document.querySelector('#all-appointments-list');
  list.innerHTML = '';
  if (!appointments.length) {
    list.innerHTML = '<p class="empty-appointments">Todavía no has agendado ninguna cita.</p>';
    return;
  }
  [...appointments].sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`)).forEach((appointment) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'all-appointment-item';
    item.innerHTML = `<span class="all-appointment-date">${dateFormatter.format(new Date(`${appointment.date}T00:00:00`))}<b>${appointment.time}</b></span><span class="all-appointment-info"><strong>${appointment.client}</strong><small>${appointment.service} · ${appointment.duration} min</small></span><span class="all-appointment-arrow">›</span>`;
    item.addEventListener('click', () => { closeAllAppointments(); showAppointmentDetails(appointment); });
    list.appendChild(item);
  });
}

function showAllAppointments() { renderAllAppointments(); allAppointmentsModal.classList.add('open'); allAppointmentsModal.setAttribute('aria-hidden', 'false'); }
function closeAllAppointments() { allAppointmentsModal.classList.remove('open'); allAppointmentsModal.setAttribute('aria-hidden', 'true'); }

function deleteActiveAppointment() {
  if (!activeAppointment || !window.confirm(`¿Borrar la cita de ${activeAppointment.client}?`)) return;
  appointments = appointments.filter((item) => item !== activeAppointment);
  localStorage.setItem(storageKey, JSON.stringify(appointments));
  activeAppointment = null;
  closeDetails();
  renderAllAppointments();
  renderCalendar();
}

document.querySelector('#open-modal').addEventListener('click', () => openAppointmentForm());
document.querySelector('#close-modal').addEventListener('click', () => toggleModal(false));
document.querySelector('#cancel-modal').addEventListener('click', () => toggleModal(false));
modal.addEventListener('click', (event) => { if (event.target === modal) toggleModal(false); });
document.querySelector('#close-details').addEventListener('click', closeDetails);
detailsModal.addEventListener('click', (event) => { if (event.target === detailsModal) closeDetails(); });
document.querySelector('#delete-details').addEventListener('click', deleteActiveAppointment);
document.querySelector('#view-all-button').addEventListener('click', showAllAppointments);
document.querySelector('#close-all-appointments').addEventListener('click', closeAllAppointments);
allAppointmentsModal.addEventListener('click', (event) => { if (event.target === allAppointmentsModal) closeAllAppointments(); });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const services = getSelectedServices();
  if (!services.length) { form.querySelector('input[name="services"]').setCustomValidity('Selecciona al menos un masaje'); form.reportValidity(); return; }
  const appointment = { client: data.get('client'), service: services.map((service) => `${service.name} · ${service.duration} min`).join(', '), services, price: services.reduce((total, service) => total + service.price, 0), date: data.get('date'), time: data.get('time'), duration: services.reduce((total, service) => total + service.duration, 0), note: data.get('note'), type: editingAppointment?.type || 'green' };
  if (editingAppointment) Object.assign(editingAppointment, appointment);
  else appointments.push(appointment);
  localStorage.setItem(storageKey, JSON.stringify(appointments));
  editingAppointment = null;
  renderAllAppointments();
  setSelectedDate(new Date(`${appointment.date}T00:00:00`)); form.reset(); updateServiceTotal(); toggleModal(false);
});
form.querySelectorAll('input[name="services"]').forEach((input) => input.addEventListener('change', () => {
  input.setCustomValidity('');
  updateServiceTotal();
}));
datePicker.addEventListener('change', (event) => setSelectedDate(new Date(`${event.target.value}T00:00:00`)));
document.querySelector('#today-button').addEventListener('click', () => setSelectedDate(new Date()));
document.querySelector('#previous-week').addEventListener('click', () => { const date = new Date(selectedDate); date.setDate(date.getDate() - (window.matchMedia('(max-width: 680px)').matches ? 1 : 7)); setSelectedDate(date); });
document.querySelector('#next-week').addEventListener('click', () => { const date = new Date(selectedDate); date.setDate(date.getDate() + (window.matchMedia('(max-width: 680px)').matches ? 1 : 7)); setSelectedDate(date); });
window.matchMedia('(max-width: 680px)').addEventListener('change', () => renderCalendar());
document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active')); item.classList.add('active'); }));

const reminderStorageKey = `${storageKey}-reminders`;
function checkAppointmentReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notified = new Set(JSON.parse(localStorage.getItem(reminderStorageKey) || '[]'));
  const now = Date.now();
  appointments.forEach((appointment) => {
    const start = new Date(`${appointment.date}T${appointment.time}:00`).getTime();
    const reminderKey = `${appointment.client}|${appointment.date}|${appointment.time}`;
    if (now >= start - 48 * 60 * 60 * 1000 && now < start && !notified.has(reminderKey)) {
      new Notification('Cita en 48 horas', { body: `${appointment.client}: ${appointment.service}, ${appointment.date} a las ${appointment.time}.` });
      notified.add(reminderKey);
    }
  });
  localStorage.setItem(reminderStorageKey, JSON.stringify([...notified]));
}

document.querySelector('.notification').addEventListener('click', async () => {
  if (!('Notification' in window) || !window.isSecureContext) {
    window.alert('Las notificaciones necesitan un navegador compatible y una conexión HTTPS o localhost.');
    return;
  }
  let permission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    window.alert('No se pudo activar el permiso para notificaciones.');
    return;
  }
  const button = document.querySelector('.notification');
  button.setAttribute('aria-label', permission === 'granted' ? 'Notificaciones activadas' : 'Activar notificaciones');
  button.title = permission === 'granted' ? 'Recordatorios activados' : 'No se concedió permiso para notificaciones';
  if (permission === 'granted') checkAppointmentReminders();
});
checkAppointmentReminders();
window.setInterval(checkAppointmentReminders, 60 * 1000);
document.addEventListener('visibilitychange', checkAppointmentReminders);
datePicker.value = toIso(selectedDate);
renderCalendar();
