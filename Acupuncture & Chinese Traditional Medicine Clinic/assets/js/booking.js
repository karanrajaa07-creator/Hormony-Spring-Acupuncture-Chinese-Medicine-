/**
 * Harmony Spring TCM Clinic - Booking Engine
 * Connects directly to backend API for live availability and collision prevention.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const bookingForm = document.getElementById('appointmentBookingForm');
  if (!bookingForm) return;

  const serviceSelect = document.getElementById('bookServiceSelect');
  const practitionerSelect = document.getElementById('bookPractitionerSelect');
  const dateInput = document.getElementById('bookDateInput');
  const slotsContainer = document.getElementById('timeSlotsContainer');
  const selectedTimeInput = document.getElementById('bookTimeSelected');
  const submitBtn = document.getElementById('bookSubmitBtn');
  const conflictAlert = document.getElementById('slotConflictAlert');

  // Pre-fill user data if logged in
  const currentUser = API.getCurrentUser();
  if (currentUser) {
    const nameInput = document.getElementById('bookPatientName');
    const emailInput = document.getElementById('bookPatientEmail');
    const phoneInput = document.getElementById('bookPatientPhone');
    if (nameInput) nameInput.value = currentUser.name || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (phoneInput) phoneInput.value = currentUser.phone || '';
  }

  // Set min date to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    // Default to tomorrow if today is late
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }

  // Check URL query parameters for pre-selected service or practitioner
  const urlParams = new URLSearchParams(window.location.search);
  const preSelectedService = urlParams.get('service');
  const preSelectedPractitioner = urlParams.get('practitioner');

  // Populate services and practitioners
  try {
    const [servicesRes, practitionersRes] = await Promise.all([
      API.services.getAll(),
      API.practitioners.getAll()
    ]);

    if (serviceSelect && servicesRes.services) {
      serviceSelect.innerHTML = '<option value="">-- Choose a Treatment Service --</option>' +
        servicesRes.services.map(s => `
          <option value="${s.id}" ${preSelectedService === s.id ? 'selected' : ''}>
            ${s.name} (${s.duration} — ${s.price})
          </option>
        `).join('');
    }

    if (practitionerSelect && practitionersRes.practitioners) {
      practitionerSelect.innerHTML = '<option value="">-- Choose a Practitioner --</option>' +
        practitionersRes.practitioners.map(p => `
          <option value="${p.id}" ${preSelectedPractitioner === p.id ? 'selected' : ''}>
            ${p.name} — ${p.title} (${p.specialization.split(',')[0]})
          </option>
        `).join('');
    }

    // If pre-selected, trigger availability fetch
    if (practitionerSelect.value && dateInput.value) {
      await fetchAvailableSlots();
    }
  } catch (err) {
    console.error('Error initializing booking selectors:', err);
  }

  // If user is currently authenticated, auto-populate patient info
  try {
    const currentUser = API.getCurrentUser();
    if (currentUser) {
      const nameInput = document.getElementById('bookPatientName');
      const emailInput = document.getElementById('bookPatientEmail');
      const phoneInput = document.getElementById('bookPatientPhone');
      if (nameInput && !nameInput.value) nameInput.value = currentUser.name || '';
      if (emailInput && !emailInput.value) emailInput.value = currentUser.email || '';
      if (phoneInput && !phoneInput.value) phoneInput.value = currentUser.phone || '';
    }
  } catch (e) {
    // Continue
  }

  // Event listeners for date & practitioner changes
  if (practitionerSelect) {
    practitionerSelect.addEventListener('change', fetchAvailableSlots);
  }
  if (dateInput) {
    dateInput.addEventListener('change', fetchAvailableSlots);
  }

  // Quick Fill Demo Data Handler
  const quickFillBtn = document.getElementById('quickFillBookingBtn');
  if (quickFillBtn) {
    quickFillBtn.addEventListener('click', async () => {
      // 1. Select Service: Acupuncture Therapy if present, else first available
      if (serviceSelect && serviceSelect.options.length > 1) {
        const acupOption = Array.from(serviceSelect.options).find(o => o.value === 'acupuncture');
        serviceSelect.value = acupOption ? 'acupuncture' : serviceSelect.options[1].value;
      }

      // 2. Select Practitioner: Dr. Meilin Chen if present, else first available
      if (practitionerSelect && practitionerSelect.options.length > 1) {
        const docOption = Array.from(practitionerSelect.options).find(o => o.value === 'doc_chen');
        practitionerSelect.value = docOption ? 'doc_chen' : practitionerSelect.options[1].value;
      }

      // 3. Select next working day (Monday - Saturday)
      const nextDate = new Date();
      for (let i = 1; i <= 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        if (d.getDay() !== 0) { // Exclude Sunday
          nextDate.setTime(d.getTime());
          break;
        }
      }
      if (dateInput) {
        dateInput.value = nextDate.toISOString().split('T')[0];
      }

      // 4. Fetch available slots for the selected date
      await fetchAvailableSlots();

      // 5. Fill Patient Information
      const nameInput = document.getElementById('bookPatientName');
      const emailInput = document.getElementById('bookPatientEmail');
      const phoneInput = document.getElementById('bookPatientPhone');
      const notesInput = document.getElementById('bookNotes');
      const consentInput = document.getElementById('bookConsent');

      if (nameInput) nameInput.value = 'Sarah Chen';
      if (emailInput) emailInput.value = 'sarah.chen@example.com';
      if (phoneInput) phoneInput.value = '(555) 234-5678';
      if (notesInput) notesInput.value = 'Persistent cervical spine stiffness and tension headaches from long desk hours. Seeking acupuncture and cupping evaluation.';
      if (consentInput) consentInput.checked = true;

      // 6. Feedback toast
      if (typeof window.showToast === 'function') {
        window.showToast('Demo appointment data populated! Ready to confirm booking.', 'success');
      }
    });
  }

  async function fetchAvailableSlots() {
    const practitionerId = practitionerSelect.value;
    const date = dateInput.value;

    if (!practitionerId || !date) {
      slotsContainer.innerHTML = '<div style="color:var(--c-ink-muted);font-size:0.9rem;padding:0.5rem 0;">Please select a practitioner and date to view live available time slots.</div>';
      selectedTimeInput.value = '';
      return;
    }

    slotsContainer.innerHTML = '<div style="font-size:0.9rem;color:var(--c-sage-600);"><svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Checking real-time clinic schedule...</div>';
    if (conflictAlert) conflictAlert.style.display = 'none';

    try {
      const data = await API.appointments.getAvailableSlots(practitionerId, date);
      const allSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:30 PM', '03:30 PM', '04:30 PM'];

      let html = '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;">';
      allSlots.forEach(slot => {
        const bookedSlots = Array.isArray(data.bookedSlots) ? data.bookedSlots : [];
        const isBooked = bookedSlots.includes(slot);
        if (isBooked) {
          html += `
            <button type="button" class="btn btn-sm" disabled style="background:#f0ebe2;color:#a89f91;border:1px dashed #d5ccc0;cursor:not-allowed;" title="Slot already reserved">
              ${slot} (Booked)
            </button>
          `;
        } else {
          html += `
            <button type="button" class="btn btn-secondary btn-sm slot-btn" data-slot="${slot}" style="border-radius:var(--radius-full);">
              ${slot}
            </button>
          `;
        }
      });
      html += '</div>';

      slotsContainer.innerHTML = html;

      // Add click handler to active slots
      const slotBtns = slotsContainer.querySelectorAll('.slot-btn');
      slotBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          slotBtns.forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
          });
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');
          selectedTimeInput.value = btn.getAttribute('data-slot');
        });
      });

      // Auto select first available slot
      if (data.availableSlots && data.availableSlots.length > 0) {
        const firstSlot = slotsContainer.querySelector(`[data-slot="${data.availableSlots[0]}"]`);
        if (firstSlot) firstSlot.click();
      } else {
        slotsContainer.innerHTML = '<div style="color:#c93b2b;font-size:0.9rem;">No slots available for this practitioner on the selected date. Please choose another date or practitioner.</div>';
        selectedTimeInput.value = '';
      }

    } catch (err) {
      slotsContainer.innerHTML = `<div style="color:#c93b2b;font-size:0.9rem;">Unable to load schedule: ${err.message}</div>`;
    }
  }

  // Handle Booking Form Submit
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const serviceId = serviceSelect.value;
    const practitionerId = practitionerSelect.value;
    const date = dateInput.value;
    const time = selectedTimeInput.value;
    const patientName = document.getElementById('bookPatientName').value.trim();
    const patientEmail = document.getElementById('bookPatientEmail').value.trim();
    const patientPhone = document.getElementById('bookPatientPhone').value.trim();
    const notes = document.getElementById('bookNotes') ? document.getElementById('bookNotes').value.trim() : '';

    if (!serviceId) {
      showToast('Please select a treatment service.', 'error');
      return;
    }
    if (!practitionerId) {
      showToast('Please select your preferred practitioner.', 'error');
      return;
    }
    if (!date) {
      showToast('Please pick an appointment date.', 'error');
      return;
    }
    if (!time) {
      showToast('Please choose an available time slot.', 'error');
      return;
    }
    if (!patientName || !patientEmail || !patientPhone) {
      showToast('Please provide your name, email, and phone number.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spin">⏳</span> Securing Your Appointment...';

    try {
      const res = await API.appointments.book({
        serviceId,
        practitionerId,
        date,
        time,
        patientName,
        patientEmail,
        patientPhone,
        notes
      });

      // Show Success Modal / Screen
      renderBookingSuccess(res.appointment);
    } catch (err) {
      if (err.message.includes('conflict') || err.message.includes('booked')) {
        if (conflictAlert) {
          conflictAlert.innerHTML = `<strong>Scheduling Conflict:</strong> ${err.message}`;
          conflictAlert.style.display = 'block';
        }
        await fetchAvailableSlots();
      }
      showToast(err.message || 'Booking submission error. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Confirm Appointment Booking';
    }
  });

  function renderBookingSuccess(apt) {
    const successContainer = document.getElementById('bookingSuccessContainer');
    const formCard = document.getElementById('bookingFormCard');

    if (successContainer && formCard) {
      formCard.style.display = 'none';
      successContainer.style.display = 'block';
      successContainer.innerHTML = `
        <div style="text-align:center;padding:3rem 2rem;background:#fff;border-radius:var(--radius-lg);box-shadow:var(--shadow-md);border:1px solid var(--c-border-light);">
          <div style="width:72px;height:72px;border-radius:var(--radius-full);background:var(--c-sage-100);color:var(--c-jade-500);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1.5rem;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style="font-size:2rem;margin-bottom:0.5rem;color:var(--c-sage-900);">Appointment Confirmed</h2>
          <p style="color:var(--c-ink-muted);font-size:0.95rem;margin-bottom:2rem;">Your appointment has been securely recorded. Confirmation details have been sent to <strong>${apt.patientEmail}</strong>.</p>
          
          <div style="max-width:540px;margin:0 auto 2.5rem;background:var(--c-sage-50);border:1px solid var(--c-sage-200);border-radius:var(--radius-md);padding:1.6rem;text-align:left;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.8rem;font-size:0.9rem;">
              <span style="color:var(--c-ink-muted);">Booking Reference:</span>
              <strong style="font-family:monospace;letter-spacing:1px;">${apt.id.toUpperCase()}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.8rem;font-size:0.9rem;">
              <span style="color:var(--c-ink-muted);">Treatment Service:</span>
              <strong>${apt.serviceName}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.8rem;font-size:0.9rem;">
              <span style="color:var(--c-ink-muted);">Practitioner:</span>
              <strong>${apt.practitionerName}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.8rem;font-size:0.9rem;">
              <span style="color:var(--c-ink-muted);">Date & Time:</span>
              <strong style="color:var(--c-jade-600);">${apt.date} at ${apt.time}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
              <span style="color:var(--c-ink-muted);">Clinical Room:</span>
              <strong>${apt.room}</strong>
            </div>
          </div>

          <div style="display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;">
            <a href="dashboard.html" class="btn btn-primary">Go to Patient Dashboard</a>
            <a href="index.html" class="btn btn-secondary">Return to Home</a>
          </div>
        </div>
      `;
    }
  }
});
