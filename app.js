const storageKey = 'serena-appointments-v2';
let appointments = JSON.parse(localStorage.getItem(storageKey) || '[]');
let selectedDate = new Date();
let activeAppointment = null;
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
  document.querySelector('#current-week').innerHTML = `${dateFormatter.format(weekStart)} — ${dateFormatter.format(weekEnd)} <span>⌄</span>`;
  document.querySelector('#heading-date').textContent = `SEMANA DEL ${dateFormatter.format(weekStart).toUpperCase()}`;
  calendarHead.innerHTML = '<div class="timezone">GMT+1 <span>⌄</span></div>';
  for (let index = 0; index < 7; index += 1) {
    const day = new Date(weekStart); day.setDate(weekStart.getDate() + index);
    const head = document.createElement('div');
    head.className = `day-head${toIso(day) === toIso(new Date()) ? ' today' : ''}`;
    head.innerHTML = `<span>${day.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span><strong>${day.getDate()}</strong>`;
    calendarHead.appendChild(head);
  }
  renderAppointments(weekStart);
}

function renderAppointments(weekStart = startOfWeek(selectedDate)) {
  daysGrid.querySelectorAll('.appointment').forEach((item) => item.remove());
  appointments.filter((appointment) => {
    const date = new Date(`${appointment.date}T00:00:00`);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    return date >= weekStart && date < weekEnd;
  }).forEach((appointment) => {
    const [hours, minutes] = appointment.time.split(':').map(Number);
    const top = ((hours - 8) * 60 + minutes);
    const day = new Date(`${appointment.date}T00:00:00`);
    const dayIndex = Math.round((day - weekStart) / 86400000);
    const card = document.createElement('div');
    card.className = `appointment ${appointment.type}`;
    card.style.cssText = `top:${top}px;height:${appointment.duration}px;left:calc(${dayIndex * 14.2857}% + 4px);width:calc(14.2857% - 8px)`;
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
  if (open) { form.elements.date.value = toIso(selectedDate); form.elements.client.focus(); }
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

document.querySelector('#open-modal').addEventListener('click', () => toggleModal(true));
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
  const appointment = { client: data.get('client'), service: services.map((service) => `${service.name} · ${service.duration} min`).join(', '), services, price: services.reduce((total, service) => total + service.price, 0), date: data.get('date'), time: data.get('time'), duration: services.reduce((total, service) => total + service.duration, 0), note: data.get('note'), type: 'green' };
  appointments.push(appointment);
  localStorage.setItem(storageKey, JSON.stringify(appointments));
  renderAllAppointments();
  setSelectedDate(new Date(`${appointment.date}T00:00:00`)); form.reset(); updateServiceTotal(); toggleModal(false);
});
form.querySelectorAll('input[name="services"]').forEach((input) => input.addEventListener('change', () => {
  input.setCustomValidity('');
  updateServiceTotal();
}));
datePicker.addEventListener('change', (event) => setSelectedDate(new Date(`${event.target.value}T00:00:00`)));
document.querySelector('#today-button').addEventListener('click', () => setSelectedDate(new Date()));
document.querySelector('#previous-week').addEventListener('click', () => { const date = new Date(selectedDate); date.setDate(date.getDate() - 7); setSelectedDate(date); });
document.querySelector('#next-week').addEventListener('click', () => { const date = new Date(selectedDate); date.setDate(date.getDate() + 7); setSelectedDate(date); });
document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active')); item.classList.add('active'); }));
datePicker.value = toIso(selectedDate);
renderCalendar();
