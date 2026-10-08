const storageKey = 'serena-appointments-v2';
let appointments = JSON.parse(localStorage.getItem(storageKey) || '[]');
let selectedDate = new Date();
let displayedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
let activeAppointment = null;
let editingAppointment = null;
const daysGrid = document.querySelector('#days-grid');
const calendarHead = document.querySelector('#calendar-head');
document.querySelector('.time-column')?.remove();
document.querySelector('#calendar-grid').classList.add('month-calendar-grid');
document.querySelectorAll('.view-button').forEach((button) => button.remove());
const modal = document.querySelector('#modal');
const detailsModal = document.querySelector('#details-modal');
const allAppointmentsModal = document.querySelector('#all-appointments-modal');
const form = document.querySelector('#appointment-form');
const datePicker = document.querySelector('#date-picker');
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

function toIso(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function setSelectedDate(date) { selectedDate = new Date(date); displayedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); datePicker.value = toIso(selectedDate); renderCalendar(); }

function renderCalendar() {
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const monthName = monthFormatter.format(displayedMonth);
  const today = new Date();
  const urgencyDate = new Date(today);
  if (today.getHours() < 1) urgencyDate.setDate(urgencyDate.getDate() - 1);
  const urgencyTodayUtc = Date.UTC(urgencyDate.getFullYear(), urgencyDate.getMonth(), urgencyDate.getDate());
  const todayKey = toIso(today);
  const monthStart = new Date(year, month, 1);
  const monthLength = new Date(year, month + 1, 0).getDate();
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const cellCount = Math.ceil((leadingDays + monthLength) / 7) * 7;
  const appointmentsByDate = new Map();
  appointments.forEach((appointment) => {
    const dayAppointments = appointmentsByDate.get(appointment.date) || [];
    dayAppointments.push(appointment);
    appointmentsByDate.set(appointment.date, dayAppointments);
  });

  calendarHead.innerHTML = '';
  ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((weekday) => {
    const label = document.createElement('div');
    label.className = 'month-weekday';
    label.textContent = weekday;
    calendarHead.appendChild(label);
  });
  daysGrid.innerHTML = '';

  for (let index = 0; index < cellCount; index += 1) {
    const dayNumber = index - leadingDays + 1;
    if (dayNumber < 1 || dayNumber > monthLength) {
      const blank = document.createElement('div');
      blank.className = 'month-day outside-month';
      blank.setAttribute('aria-hidden', 'true');
      daysGrid.appendChild(blank);
      continue;
    }

    const day = new Date(year, month, dayNumber);
    const dayKey = toIso(day);
    const dayAppointments = appointmentsByDate.get(dayKey) || [];
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `month-day${dayKey === todayKey ? ' is-today' : ''}${dayKey === toIso(selectedDate) ? ' is-selected' : ''}`;
    cell.setAttribute('aria-label', `${dateFormatter.format(day)}, ${dayAppointments.length} ${dayAppointments.length === 1 ? 'cita' : 'citas'}`);

    const number = document.createElement('span');
    number.className = 'month-day-number';
    number.textContent = dayNumber;
    cell.appendChild(number);

    if (dayAppointments.length) {
      const dayUtc = Date.UTC(year, month, dayNumber);
      const daysUntilAppointment = Math.round((dayUtc - urgencyTodayUtc) / 86400000);
      const urgency = daysUntilAppointment < 0 ? 'past' : daysUntilAppointment <= 1 ? 'red' : daysUntilAppointment <= 4 ? 'orange' : 'green';
      const marker = document.createElement('span');
      marker.className = `appointment-dot urgency-${urgency}`;
      marker.setAttribute('aria-hidden', 'true');
      cell.appendChild(marker);
      const count = document.createElement('span');
      count.className = 'month-day-count';
      count.textContent = `${dayAppointments.length} ${dayAppointments.length === 1 ? 'cita' : 'citas'}`;
      cell.appendChild(count);
    }

    cell.addEventListener('click', () => {
      selectedDate = day;
      datePicker.value = dayKey;
      if (dayAppointments.length) {
        if (dayAppointments.length === 1) showAppointmentDetails(dayAppointments[0]);
        else showAllAppointments(dayKey);
      } else {
        openAppointmentForm();
      }
      renderCalendar();
    });
    daysGrid.appendChild(cell);
  }

  document.querySelector('#current-week').textContent = monthName;
  document.querySelector('#heading-date').textContent = monthName.toUpperCase();
  document.querySelector('.page-heading h1').textContent = 'Tu mes, en calma.';
  document.querySelector('.breadcrumb strong').textContent = 'Mes actual';
  document.querySelector('#previous-week').setAttribute('aria-label', 'Mes anterior');
  document.querySelector('#next-week').setAttribute('aria-label', 'Mes siguiente');
  document.querySelector('#calendar-grid').closest('.calendar-card').setAttribute('aria-label', 'Calendario mensual');
  document.querySelector('#week-total').textContent = appointments.filter((appointment) => appointment.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}-`)).length;
  document.querySelector('#week-total').parentElement.querySelector('span').textContent = 'citas este mes';
  document.querySelector('.calendar-footer').innerHTML = '<span class="urgency-legend green"></span> 5 días o más <span class="urgency-legend orange"></span> 2 a 4 días <span class="urgency-legend red"></span> 1 día o hoy';
}

function scheduleDailyCalendarRefresh() {
  const now = new Date();
  const nextRefresh = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0, 0);
  if (nextRefresh <= now) nextRefresh.setDate(nextRefresh.getDate() + 1);
  window.setTimeout(() => { renderCalendar(); scheduleDailyCalendarRefresh(); }, nextRefresh - now);
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

function renderAllAppointments(dateFilter = null) {
  const list = document.querySelector('#all-appointments-list');
  list.innerHTML = '';
  document.querySelector('#all-appointments-modal h2').textContent = dateFilter ? 'Citas del día' : 'Todas tus citas';
  const visibleAppointments = dateFilter ? appointments.filter((appointment) => appointment.date === dateFilter) : appointments;
  if (!visibleAppointments.length) {
    list.innerHTML = '<p class="empty-appointments">Todavía no has agendado ninguna cita.</p>';
    return;
  }
  [...visibleAppointments].sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`)).forEach((appointment) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'all-appointment-item';
    item.innerHTML = `<span class="all-appointment-date">${dateFormatter.format(new Date(`${appointment.date}T00:00:00`))}<b>${appointment.time}</b></span><span class="all-appointment-info"><strong>${appointment.client}</strong><small>${appointment.service} · ${appointment.duration} min</small></span><span class="all-appointment-arrow">›</span>`;
    item.addEventListener('click', () => { closeAllAppointments(); showAppointmentDetails(appointment); });
    list.appendChild(item);
  });
}

function showAllAppointments(dateFilter = null) { renderAllAppointments(dateFilter); allAppointmentsModal.classList.add('open'); allAppointmentsModal.setAttribute('aria-hidden', 'false'); }
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
function changeMonth(offset) {
  displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + offset, 1);
  const lastDay = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 0).getDate();
  selectedDate = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), Math.min(selectedDate.getDate(), lastDay));
  datePicker.value = toIso(selectedDate);
  renderCalendar();
}

document.querySelector('#previous-week').addEventListener('click', () => changeMonth(-1));
document.querySelector('#next-week').addEventListener('click', () => changeMonth(1));
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
scheduleDailyCalendarRefresh();
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderCalendar(); });
