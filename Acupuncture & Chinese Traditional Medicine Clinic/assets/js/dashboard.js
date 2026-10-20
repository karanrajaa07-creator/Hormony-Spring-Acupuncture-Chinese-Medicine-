/**
 * Harmony Spring TCM Clinic - Patient Dashboard Controller
 * Full client-side interactivity backed by REST API.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Authentication check
  const token = API.getToken();
  const currentUser = API.getCurrentUser();

  if (!token || !currentUser) {
    window.location.href = 'login.html?redirect=dashboard.html';
    return;
  }

  // Populate user header & sidebar
  initUserDisplay(currentUser);
  initSidebarTabs();
  initModals();

  // Load all dashboard data in parallel
  await loadDashboardOverview();
  await loadAppointmentsTab();
  await loadTreatmentPlanTab();
  await loadPrescriptionsTab();
  await loadNotificationsTab();
  initProfileForm(currentUser);
});

// Update User UI elements
function initUserDisplay(user) {
  const firstName = user.name ? user.name.split(' ')[0] : 'Patient';
  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PT';

  const welcomeNameElem = document.getElementById('dashWelcomeName');
  if (welcomeNameElem) welcomeNameElem.textContent = firstName;

  const userAvatarElem = document.getElementById('dashUserAvatar');
  if (userAvatarElem) userAvatarElem.textContent = initials;

  const sidebarNameElem = document.getElementById('dashSidebarName');
  if (sidebarNameElem) sidebarNameElem.textContent = user.name;

  const sidebarRoleElem = document.getElementById('dashSidebarRole');
  if (sidebarRoleElem) {
    sidebarRoleElem.textContent = user.role === 'practitioner' ? 'Staff Physician' : 'Verified Patient';
  }
}

// Tab navigation controller
function initSidebarTabs() {
  const menuLinks = document.querySelectorAll('.sidebar-menu-link[data-tab]');
  const panels = document.querySelectorAll('.dashboard-view-panel');

  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetTab = link.getAttribute('data-tab');

      if (targetTab === 'book') {
        e.preventDefault();
        window.location.href = 'booking.html';
        return;
      }

      const matchingPanel = document.getElementById(`tab-${targetTab}`);
      if (!matchingPanel) {
        return;
      }

      e.preventDefault();
      menuLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      panels.forEach(p => {
        if (p.id === `tab-${targetTab}`) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });

      // Update URL hash without scroll
      history.replaceState(null, null, `#${targetTab}`);
    });
  });

  // Handle URL hash on load
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    if (hash === 'book') {
      window.location.href = 'booking.html';
      return;
    }
    const targetLink = document.querySelector(`.sidebar-menu-link[data-tab="${hash}"]`);
    if (targetLink) targetLink.click();
  }
}

// 1. Overview Tab Data
async function loadDashboardOverview() {
  try {
    const [aptsRes, plansRes, rxsRes] = await Promise.all([
      API.appointments.getMy(),
      API.clinical.getTreatmentPlans(),
      API.clinical.getPrescriptions()
    ]);

    const upcomingApts = aptsRes.appointments.filter(a => a.status === 'confirmed');
    const nextApt = upcomingApts[0];

    // Widget: Next appointment
    const nextAptElem = document.getElementById('widgetNextApt');
    if (nextAptElem) {
      if (nextApt) {
        nextAptElem.innerHTML = `<strong>${nextApt.date}</strong> at ${nextApt.time} (${nextApt.serviceName})`;
      } else {
        nextAptElem.innerHTML = '<em>No upcoming visits scheduled</em>';
      }
    }

    // Widget: Active plan
    const activePlan = plansRes.treatmentPlans ? plansRes.treatmentPlans[0] : null;
    const activePlanElem = document.getElementById('widgetActivePlan');
    if (activePlanElem) {
      if (activePlan) {
        activePlanElem.innerHTML = `<strong>${activePlan.completedSessions} of ${activePlan.totalRecommendedSessions} Sessions</strong> (${activePlan.progressPercentage}% Completed)`;
      } else {
        activePlanElem.innerHTML = '<em>No active treatment plan</em>';
      }
    }

    // Widget: Herbal Prescriptions count
    const activeRx = rxsRes.herbalPrescriptions ? rxsRes.herbalPrescriptions[0] : null;
    const activeRxElem = document.getElementById('widgetActiveRx');
    if (activeRxElem) {
      if (activeRx) {
        activeRxElem.innerHTML = `<strong>${activeRx.formulaName.split('&')[0]}</strong> (Review: ${activeRx.reviewDate})`;
      } else {
        activeRxElem.innerHTML = '<em>No active prescription</em>';
      }
    }

    // Overview Upcoming list
    const overviewUpcomingContainer = document.getElementById('overviewUpcomingContainer');
    if (overviewUpcomingContainer) {
      if (upcomingApts.length > 0) {
        overviewUpcomingContainer.innerHTML = upcomingApts.slice(0, 2).map(renderAppointmentCard).join('');
      } else {
        overviewUpcomingContainer.innerHTML = `
          <div style="text-align:center;padding:2rem;color:var(--c-ink-muted);">
            <p>You have no upcoming appointments scheduled.</p>
            <button class="btn btn-primary btn-sm" onclick="switchToTab('book')">Schedule an Appointment</button>
          </div>
        `;
      }
    }

  } catch (err) {
    console.error('Error loading dashboard overview:', err);
  }
}

function switchToTab(tabName) {
  if (tabName === 'book') {
    window.location.href = 'booking.html';
    return;
  }
  const link = document.querySelector(`.sidebar-menu-link[data-tab="${tabName}"]`);
  if (link) link.click();
}
window.switchToTab = switchToTab;

// 2. Appointments Tab Data
async function loadAppointmentsTab() {
  const upcomingContainer = document.getElementById('appointmentsUpcomingContainer');
  const pastContainer = document.getElementById('appointmentsPastContainer');

  try {
    const res = await API.appointments.getMy();
    const apts = res.appointments || [];

    const upcoming = apts.filter(a => a.status === 'confirmed');
    const past = apts.filter(a => a.status === 'completed' || a.status === 'cancelled');

    if (upcomingContainer) {
      if (upcoming.length > 0) {
        upcomingContainer.innerHTML = upcoming.map(renderAppointmentCard).join('');
      } else {
        upcomingContainer.innerHTML = '<p style="color:var(--c-ink-muted);padding:1rem 0;">No upcoming appointments.</p>';
      }
    }

    if (pastContainer) {
      if (past.length > 0) {
        pastContainer.innerHTML = past.map(renderAppointmentCard).join('');
      } else {
        pastContainer.innerHTML = '<p style="color:var(--c-ink-muted);padding:1rem 0;">No past appointment history.</p>';
      }
    }

    // Attach actions
    attachAppointmentActionListeners();
  } catch (err) {
    console.error('Error loading appointments:', err);
  }
}

function renderAppointmentCard(apt) {
  const dateObj = new Date(apt.date + 'T00:00:00');
  const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
  const dayStr = dateObj.getDate();

  const isUpcoming = apt.status === 'confirmed';

  return `
    <div class="appointment-item-card" data-id="${apt.id}">
      <div class="apt-left-meta">
        <div class="apt-date-badge">
          <span class="apt-month">${monthStr}</span>
          <span class="apt-day">${dayStr}</span>
        </div>
        <div class="apt-details-text">
          <h4>${apt.serviceName}</h4>
          <p style="margin-bottom:0.2rem;">With <strong>${apt.practitionerName}</strong> &bull; ${apt.time}</p>
          <p style="font-size:0.8rem;color:var(--c-sage-600);">${apt.room || 'Clinical Room'}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;margin-left:auto;">
        <span class="status-badge status-${apt.status}">${apt.status}</span>
        ${isUpcoming ? `
          <div class="apt-actions">
            <button class="btn btn-secondary btn-sm reschedule-btn" data-id="${apt.id}" data-date="${apt.date}" data-time="${apt.time}" data-practitioner="${apt.practitionerId}">
              Reschedule
            </button>
            <button class="btn btn-sm cancel-btn" data-id="${apt.id}" style="color:#c93b2b;background:none;border:1px solid #eccbc8;">
              Cancel
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function attachAppointmentActionListeners() {
  document.querySelectorAll('.reschedule-btn').forEach(btn => {
    btn.onclick = () => openRescheduleModal(btn.dataset.id, btn.dataset.date, btn.dataset.time, btn.dataset.practitioner);
  });
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.onclick = () => openCancelModal(btn.dataset.id);
  });
}

// 3. Treatment Plan Tab Data
async function loadTreatmentPlanTab() {
  const container = document.getElementById('treatmentPlanViewContainer');
  if (!container) return;

  try {
    const res = await API.clinical.getTreatmentPlans();
    const plans = res.treatmentPlans || [];

    if (plans.length === 0) {
      container.innerHTML = `
        <div class="dash-card" style="text-align:center;padding:3rem;">
          <p style="color:var(--c-ink-muted);">You do not currently have an authorized treatment plan on file.</p>
          <p style="font-size:0.9rem;">Treatment plans are formulated following your initial Comprehensive TCM Diagnostic Evaluation.</p>
        </div>
      `;
      return;
    }

    const plan = plans[0];
    container.innerHTML = `
      <div class="treatment-plan-hero">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;">
          <div>
            <span class="tcm-badge" style="background:rgba(255,255,255,0.15);color:#fff;border-color:rgba(255,255,255,0.3);margin-bottom:0.75rem;">
              Clinical Care Plan
            </span>
            <h2 style="color:#fff;font-size:1.85rem;margin-bottom:0.3rem;">${plan.planName}</h2>
            <p style="color:rgba(255,255,255,0.85);font-size:0.92rem;margin:0;">
              Supervising Physician: <strong>${plan.practitionerName}</strong> &bull; Started: ${plan.startDate}
            </p>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-serif);font-size:2.2rem;font-weight:700;line-height:1;color:var(--c-gold);">
              ${plan.completedSessions} / ${plan.totalRecommendedSessions}
            </div>
            <span style="font-size:0.8rem;color:rgba(255,255,255,0.8);">Sessions Completed</span>
          </div>
        </div>

        <div class="tp-progress-bar-wrap">
          <div class="tp-progress-bar-fill" style="width: ${plan.progressPercentage}%;"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:2rem;" class="plan-details-grid">
        <div>
          <div class="dash-card">
            <h3 style="margin-bottom:1.2rem;">Treatment Progress Timeline</h3>
            <div class="sessions-timeline">
              ${plan.sessions.map((s, idx) => `
                <div class="timeline-step-item ${s.status === 'Completed' ? 'completed' : (s.status === 'Scheduled' ? 'active' : '')}">
                  <div class="timeline-dot">${idx + 1}</div>
                  <div class="timeline-card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
                      <h4>${s.title}</h4>
                      <span class="status-badge ${s.status === 'Completed' ? 'status-completed' : (s.status === 'Scheduled' ? 'status-confirmed' : '')}">
                        ${s.status}
                      </span>
                    </div>
                    <div class="timeline-card-meta">
                      ${s.date} &bull; Modality: <strong>${s.modality}</strong>
                    </div>
                    <p style="font-size:0.9rem;color:var(--c-ink-body);margin:0;">${s.notes}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div>
          <div class="dash-card" style="margin-bottom:1.5rem;">
            <h3 style="margin-bottom:1rem;">TCM Pattern Diagnosis</h3>
            <div style="background:var(--c-sage-50);border:1px solid var(--c-sage-200);border-radius:var(--radius-sm);padding:1.2rem;margin-bottom:1.2rem;">
              <strong style="color:var(--c-sage-900);display:block;margin-bottom:0.3rem;">Diagnosed Pattern:</strong>
              <p style="margin:0;font-size:0.92rem;color:var(--c-ink-dark);">${plan.diagnosedPattern}</p>
            </div>
            <h4 style="font-size:1.05rem;margin-bottom:0.6rem;">Clinical Care Goals:</h4>
            <ul style="padding-left:1.2rem;font-size:0.88rem;color:var(--c-ink-body);line-height:1.7;">
              ${plan.clinicalGoals.map(g => `<li>${g}</li>`).join('')}
            </ul>
          </div>

          <div class="dash-card" style="border-left:4px solid var(--c-jade-500);">
            <h3 style="margin-bottom:0.6rem;">Practitioner Notes (Approved for Patient)</h3>
            <p style="font-size:0.9rem;color:var(--c-ink-body);line-height:1.7;margin-bottom:1.2rem;">
              "${plan.clinicalNotes}"
            </p>
            <div style="background:var(--c-gold-light);padding:1rem;border-radius:var(--radius-sm);font-size:0.85rem;">
              <strong>Homecare Routine:</strong> ${plan.homecareInstructions}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error loading treatment plans:', err);
  }
}

// 4. Prescriptions Tab Data
async function loadPrescriptionsTab() {
  const container = document.getElementById('prescriptionsViewContainer');
  if (!container) return;

  try {
    const res = await API.clinical.getPrescriptions();
    const rxs = res.herbalPrescriptions || [];

    if (rxs.length === 0) {
      container.innerHTML = `
        <div class="dash-card" style="text-align:center;padding:3rem;">
          <p style="color:var(--c-ink-muted);">No authorized herbal prescriptions found on your record.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = rxs.map(rx => `
      <div class="prescription-doc-card">
        <div class="rx-top-banner">
          <div>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
              <span class="tcm-seal">和</span>
              <span style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:var(--c-sage-700);">
                OFFICIAL TCM BOTANICAL PRESCRIPTION
              </span>
            </div>
            <h2 style="font-size:1.8rem;margin-bottom:0.2rem;">${rx.formulaName}</h2>
            <div style="font-family:var(--font-serif);color:var(--c-sage-700);font-size:1.15rem;margin-bottom:0.4rem;">
              ${rx.traditionalPinyin}
            </div>
            <p style="font-size:0.85rem;color:var(--c-ink-muted);margin:0;">
              Prescription #${rx.prescriptionNumber} &bull; Authorized by <strong>${rx.prescribingDoctor}</strong> on ${rx.prescribedDate}
            </p>
          </div>
          <div style="display:flex;align-items:center;gap:1.5rem;">
            <div class="rx-stamp-seal" title="Clinic Quality Seal">
              <span>仁心</span>
              <span>仁术</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.print()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Record
            </button>
          </div>
        </div>

        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:1.1rem;margin-bottom:0.75rem;">Formula Composition & Dosages:</h4>
          <table class="herbs-table">
            <thead>
              <tr>
                <th>Chinese / Pinyin</th>
                <th>Latin Botanical</th>
                <th>Prescribed Grams</th>
                <th>Target Action in Formula</th>
              </tr>
            </thead>
            <tbody>
              ${rx.herbalIngredients.map(ing => `
                <tr>
                  <td><strong>${ing.chinese}</strong> (${ing.pinyin})</td>
                  <td style="font-style:italic;">${ing.latin}</td>
                  <td><strong>${ing.dosage}</strong></td>
                  <td style="color:var(--c-ink-body);">${ing.function}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="rx-instruction-box">
          <strong style="color:var(--c-sage-900);display:block;margin-bottom:0.3rem;">Administration Instructions:</strong>
          ${rx.administration}
          <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--c-ink-muted);">
            Course: <strong>${rx.duration}</strong> &bull; Next Clinical Review: <strong>${rx.reviewDate}</strong> &bull; Refills Remaining: <strong>${rx.refillsRemaining}</strong>
          </div>
        </div>

        <div class="rx-allergy-alert">
          <strong>Documented Safety Verification:</strong> ${rx.precautions}
        </div>

        <div style="margin-top:1.5rem;font-size:0.8rem;color:var(--c-ink-muted);border-top:1px dashed var(--c-border);padding-top:0.8rem;">
          Dispensing Pharmacy: ${rx.dispensingPharmacy}
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading prescriptions:', err);
  }
}

// 5. Notifications Tab Data
async function loadNotificationsTab() {
  const container = document.getElementById('notificationsViewContainer');
  if (!container) return;

  try {
    const res = await API.clinical.getNotifications();
    const list = res.notifications || [];

    if (list.length === 0) {
      container.innerHTML = '<p style="color:var(--c-ink-muted);">No notifications at this time.</p>';
      return;
    }

    container.innerHTML = list.map(n => `
      <div style="background:#fff;border:1px solid var(--c-border-light);border-left:4px solid var(--c-jade-500);border-radius:var(--radius-sm);padding:1.2rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h4 style="font-size:1.05rem;margin-bottom:0.25rem;">${n.title}</h4>
          <p style="font-size:0.9rem;color:var(--c-ink-body);margin:0;">${n.message}</p>
        </div>
        <span style="font-size:0.75rem;color:var(--c-ink-muted);white-space:nowrap;margin-left:1rem;">
          ${new Date(n.date).toLocaleDateString()}
        </span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}

// 6. Profile Form
function initProfileForm(user) {
  const form = document.getElementById('profileEditForm');
  if (!form) return;

  document.getElementById('profileName').value = user.name || '';
  document.getElementById('profileEmail').value = user.email || '';
  document.getElementById('profilePhone').value = user.phone || '';
  document.getElementById('profileDob').value = user.dob || '';
  document.getElementById('profileEmergency').value = user.emergencyContact || '';
  document.getElementById('profileAllergies').value = Array.isArray(user.allergies) ? user.allergies.join(', ') : (user.allergies || '');
  document.getElementById('profileHealthNotes').value = user.healthNotes || '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('profilePhone').value.trim();
    const emergencyContact = document.getElementById('profileEmergency').value.trim();
    const allergiesStr = document.getElementById('profileAllergies').value.trim();
    const allergies = allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : [];
    const healthNotes = document.getElementById('profileHealthNotes').value.trim();

    try {
      const res = await API.clinical.updateProfile({
        phone,
        emergencyContact,
        allergies,
        healthNotes
      });
      API.setSession(null, res.user);
      showToast('Profile records updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Error updating profile.', 'error');
    }
  });
}

// Modals: Reschedule & Cancel
let activeAptIdForAction = null;
function initModals() {
  const rescheduleModal = document.getElementById('rescheduleModal');
  const cancelModal = document.getElementById('cancelModal');

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.onclick = () => {
      if (rescheduleModal) rescheduleModal.classList.remove('open');
      if (cancelModal) cancelModal.classList.remove('open');
    };
  });

  const confirmRescheduleBtn = document.getElementById('confirmRescheduleBtn');
  if (confirmRescheduleBtn) {
    confirmRescheduleBtn.onclick = async () => {
      const newDate = document.getElementById('rescheduleDateInput').value;
      const newTime = document.getElementById('rescheduleTimeSelect').value;

      if (!newDate || !newTime) {
        showToast('Please pick a new date and time slot.', 'error');
        return;
      }

      confirmRescheduleBtn.disabled = true;
      try {
        await API.appointments.reschedule(activeAptIdForAction, newDate, newTime);
        showToast('Appointment rescheduled successfully!', 'success');
        rescheduleModal.classList.remove('open');
        await loadAppointmentsTab();
        await loadDashboardOverview();
      } catch (err) {
        showToast(err.message || 'Rescheduling error.', 'error');
      } finally {
        confirmRescheduleBtn.disabled = false;
      }
    };
  }

  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  if (confirmCancelBtn) {
    confirmCancelBtn.onclick = async () => {
      confirmCancelBtn.disabled = true;
      try {
        await API.appointments.cancel(activeAptIdForAction);
        showToast('Appointment successfully cancelled.', 'success');
        cancelModal.classList.remove('open');
        await loadAppointmentsTab();
        await loadDashboardOverview();
      } catch (err) {
        showToast(err.message || 'Cancellation error.', 'error');
      } finally {
        confirmCancelBtn.disabled = false;
      }
    };
  }
}

async function openRescheduleModal(aptId, currentDate, currentTime, practitionerId) {
  activeAptIdForAction = aptId;
  const modal = document.getElementById('rescheduleModal');
  const dateInput = document.getElementById('rescheduleDateInput');
  const timeSelect = document.getElementById('rescheduleTimeSelect');

  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = currentDate || today;

  async function updateRescheduleSlots() {
    timeSelect.innerHTML = '<option value="">Checking slots...</option>';
    try {
      const data = await API.appointments.getAvailableSlots(practitionerId, dateInput.value);
      timeSelect.innerHTML = '<option value="">-- Choose New Time Slot --</option>' +
        data.availableSlots.map(s => `<option value="${s}" ${s === currentTime ? 'selected' : ''}>${s}</option>`).join('');
    } catch (e) {
      timeSelect.innerHTML = '<option value="">Error loading slots</option>';
    }
  }

  dateInput.onchange = updateRescheduleSlots;
  await updateRescheduleSlots();

  modal.classList.add('open');
}

function openCancelModal(aptId) {
  activeAptIdForAction = aptId;
  const modal = document.getElementById('cancelModal');
  modal.classList.add('open');
}
