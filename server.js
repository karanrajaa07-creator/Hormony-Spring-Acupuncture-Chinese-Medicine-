const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// In-memory sessions store (Token -> { userId, role, expiresAt })
const activeSessions = new Map();
// Reset tokens store (Token -> { email, expiresAt })
const passwordResetTokens = new Map();

// Helper to read DB
function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { users: [], services: [], practitioners: [], appointments: [], treatmentPlans: [], herbalPrescriptions: [], notifications: [], blogPosts: [], faqs: [] };
  }
}

// Helper to write DB
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// Helper to hash password
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Helper to get request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 2 * 1024 * 1024) { // 2MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON response
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

// Helper to authenticate request
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (let c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'tcm_token') {
        token = v;
        break;
      }
    }
  }

  if (!token) return null;

  const session = activeSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  const db = readDb();
  const user = db.users.find(u => u.id === session.userId);
  if (!user) return null;

  const { passwordSalt, passwordHash, ...safeUser } = user;
  return safeUser;
}

// Standard available clinic time slots
const ALL_TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '01:30 PM',
  '02:30 PM',
  '03:30 PM',
  '04:30 PM'
];

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  // --- API ROUTES ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Auth: Register
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const { name, email, password, phone, dob, gender, allergies, emergencyContact } = body;

        if (!name || !email || !password) {
          return sendJson(res, 400, { success: false, error: 'Name, email, and password are required.' });
        }

        const emailLower = email.toLowerCase().trim();
        const db = readDb();
        if (db.users.some(u => u.email.toLowerCase() === emailLower)) {
          return sendJson(res, 409, { success: false, error: 'An account with this email address already exists.' });
        }

        // Validate password strength
        if (password.length < 8) {
          return sendJson(res, 400, { success: false, error: 'Password must be at least 8 characters long.' });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(password, salt);
        const newUser = {
          id: 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
          name: name.trim(),
          email: emailLower,
          passwordSalt: salt,
          passwordHash: hash,
          role: 'patient',
          phone: phone || '',
          dob: dob || '',
          gender: gender || 'Not specified',
          allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
          emergencyContact: emergencyContact || '',
          healthNotes: 'New patient registration intake.',
          createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        writeDb(db);

        // Generate session token
        const token = crypto.randomBytes(32).toString('hex');
        activeSessions.set(token, {
          userId: newUser.id,
          role: newUser.role,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        const { passwordSalt, passwordHash, ...safeUser } = newUser;
        return sendJson(res, 201, {
          success: true,
          message: 'Account successfully registered.',
          token,
          user: safeUser
        });
      }

      // 2. Auth: Login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendJson(res, 400, { success: false, error: 'Email and password are required.' });
        }

        const emailLower = email.toLowerCase().trim();
        const db = readDb();
        const user = db.users.find(u => u.email.toLowerCase() === emailLower);

        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Invalid email or password.' });
        }

        const testHash = hashPassword(password, user.passwordSalt);
        if (testHash !== user.passwordHash) {
          return sendJson(res, 401, { success: false, error: 'Invalid email or password.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        activeSessions.set(token, {
          userId: user.id,
          role: user.role,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        });

        const { passwordSalt, passwordHash, ...safeUser } = user;
        return sendJson(res, 200, {
          success: true,
          message: 'Login successful.',
          token,
          user: safeUser
        });
      }

      // 3. Auth: Current User Profile
      if (pathname === '/api/auth/me' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Unauthorized session.' });
        }
        return sendJson(res, 200, { success: true, user });
      }

      // 4. Auth: Logout
      if (pathname === '/api/auth/logout' && method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7).trim();
          activeSessions.delete(token);
        }
        return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
      }

      // 5. Auth: Forgot Password
      if (pathname === '/api/auth/forgot-password' && method === 'POST') {
        const body = await parseBody(req);
        const { email } = body;
        if (!email) {
          return sendJson(res, 400, { success: false, error: 'Please enter your account email.' });
        }

        const emailLower = email.toLowerCase().trim();
        const db = readDb();
        const user = db.users.find(u => u.email.toLowerCase() === emailLower);

        if (!user) {
          // Privacy: do not reveal email existence
          return sendJson(res, 200, {
            success: true,
            message: 'If an account exists with this email, password reset instructions have been generated.'
          });
        }

        const resetToken = crypto.randomBytes(16).toString('hex');
        passwordResetTokens.set(resetToken, {
          email: user.email,
          expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
        });

        return sendJson(res, 200, {
          success: true,
          message: 'Password reset link generated.',
          resetToken, // for testing convenience
          expiresIn: '60 minutes'
        });
      }

      // 6. Auth: Reset Password
      if (pathname === '/api/auth/reset-password' && method === 'POST') {
        const body = await parseBody(req);
        const { resetToken, newPassword } = body;

        if (!resetToken || !newPassword) {
          return sendJson(res, 400, { success: false, error: 'Token and new password are required.' });
        }

        const entry = passwordResetTokens.get(resetToken);
        if (!entry || Date.now() > entry.expiresAt) {
          return sendJson(res, 400, { success: false, error: 'Reset token is invalid or has expired.' });
        }

        if (newPassword.length < 8) {
          return sendJson(res, 400, { success: false, error: 'Password must be at least 8 characters long.' });
        }

        const db = readDb();
        const user = db.users.find(u => u.email.toLowerCase() === entry.email.toLowerCase());
        if (!user) {
          return sendJson(res, 404, { success: false, error: 'User account not found.' });
        }

        const salt = crypto.randomBytes(16).toString('hex');
        user.passwordSalt = salt;
        user.passwordHash = hashPassword(newPassword, salt);
        writeDb(db);

        passwordResetTokens.delete(resetToken);

        return sendJson(res, 200, { success: true, message: 'Password has been successfully updated. You may now log in.' });
      }

      // 7. Services list & detail
      if (pathname === '/api/services' && method === 'GET') {
        const db = readDb();
        return sendJson(res, 200, { success: true, services: db.services });
      }

      if (pathname.startsWith('/api/services/') && method === 'GET') {
        const serviceId = pathname.replace('/api/services/', '').trim();
        const aliasMap = {
          'moxibustion': 'pain-management',
          'pain-management': 'pain-management',
          'wellness-consultation': 'stress-wellness',
          'stress-wellness': 'stress-wellness',
          'initial-acupuncture': 'acupuncture',
          'acupuncture': 'acupuncture',
          'personalized-consultation': 'tcm-consultation',
          'tcm-consultation': 'tcm-consultation'
        };
        const targetId = aliasMap[serviceId] || serviceId;
        const db = readDb();
        const service = db.services.find(s => s.id === targetId || s.id === serviceId);
        if (!service) {
          return sendJson(res, 404, { success: false, error: 'Service not found.' });
        }
        return sendJson(res, 200, { success: true, service });
      }

      // 8. Practitioners list & detail
      if (pathname === '/api/practitioners' && method === 'GET') {
        const db = readDb();
        return sendJson(res, 200, { success: true, practitioners: db.practitioners });
      }

      if (pathname.startsWith('/api/practitioners/') && method === 'GET') {
        const docId = pathname.replace('/api/practitioners/', '').trim();
        const db = readDb();
        const practitioner = db.practitioners.find(p => p.id === docId);
        if (!practitioner) {
          return sendJson(res, 404, { success: false, error: 'Practitioner not found.' });
        }
        return sendJson(res, 200, { success: true, practitioner });
      }

      // 9. Available Slots for Appointment
      if (pathname === '/api/appointments/available-slots' && method === 'GET') {
        const { practitionerId, date } = parsedUrl.query;
        if (!practitionerId || !date) {
          return sendJson(res, 400, { success: false, error: 'Practitioner and date are required.' });
        }

        const db = readDb();
        // Find existing booked slots for this practitioner on this date
        const bookedSlots = db.appointments
          .filter(a => a.practitionerId === practitionerId && a.date === date && a.status !== 'cancelled')
          .map(a => a.time);

        const availableSlots = ALL_TIME_SLOTS.filter(slot => !bookedSlots.includes(slot));

        return sendJson(res, 200, {
          success: true,
          practitionerId,
          date,
          totalSlots: ALL_TIME_SLOTS.length,
          bookedSlots,
          availableSlots
        });
      }

      // 10. Book Appointment
      if (pathname === '/api/appointments/book' && method === 'POST') {
        const body = await parseBody(req);
        const { serviceId, practitionerId, date, time, patientName, patientEmail, patientPhone, notes } = body;

        if (!serviceId || !practitionerId || !date || !time) {
          return sendJson(res, 400, { success: false, error: 'Service, practitioner, date, and time slot are required.' });
        }

        const db = readDb();
        const service = db.services.find(s => s.id === serviceId);
        const practitioner = db.practitioners.find(p => p.id === practitionerId);

        if (!service || !practitioner) {
          return sendJson(res, 400, { success: false, error: 'Invalid service or practitioner selected.' });
        }

        // Prevent conflicting bookings for the same practitioner and time slot
        const isConflict = db.appointments.some(a =>
          a.practitionerId === practitionerId &&
          a.date === date &&
          a.time === time &&
          a.status !== 'cancelled'
        );

        if (isConflict) {
          return sendJson(res, 409, {
            success: false,
            error: `The slot ${time} on ${date} for ${practitioner.name} was just booked by another patient. Please select an alternate time slot.`
          });
        }

        // Check if user is authenticated
        const currentUser = getAuthUser(req);
        const patientId = currentUser ? currentUser.id : ('guest_' + Date.now());
        const finalName = currentUser ? currentUser.name : (patientName || 'Patient');
        const finalEmail = currentUser ? currentUser.email : (patientEmail || '');
        const finalPhone = currentUser ? currentUser.phone : (patientPhone || '');

        const newAppointment = {
          id: 'apt_' + Date.now(),
          patientId,
          patientName: finalName,
          patientEmail: finalEmail,
          patientPhone: finalPhone,
          serviceId: service.id,
          serviceName: service.name,
          practitionerId: practitioner.id,
          practitionerName: practitioner.name,
          date,
          time,
          status: 'confirmed',
          room: 'Room ' + (Math.floor(Math.random() * 3) + 1) + ' (Clinical Suite)',
          notes: notes || 'Booked online.',
          createdAt: new Date().toISOString()
        };

        db.appointments.push(newAppointment);

        // Add a notification for this user
        if (currentUser) {
          db.notifications.unshift({
            id: 'notif_' + Date.now(),
            userId: currentUser.id,
            title: `Appointment Confirmed: ${service.name}`,
            message: `Your appointment with ${practitioner.name} on ${date} at ${time} has been confirmed.`,
            date: new Date().toISOString(),
            unread: true,
            type: 'appointment'
          });
        }

        writeDb(db);

        return sendJson(res, 201, {
          success: true,
          message: 'Appointment successfully confirmed!',
          appointment: newAppointment
        });
      }

      // 11. My Appointments (Role-protected: Patient sees only own, staff sees all)
      if (pathname === '/api/appointments/my' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Please log in to view appointments.' });
        }

        const db = readDb();
        let list;
        if (user.role === 'practitioner' || user.role === 'staff') {
          list = db.appointments;
        } else {
          list = db.appointments.filter(a => a.patientId === user.id || a.patientEmail.toLowerCase() === user.email.toLowerCase());
        }

        // Sort by date desc
        list.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

        return sendJson(res, 200, { success: true, appointments: list });
      }

      // 12. Cancel Appointment
      if (pathname.match(/^\/api\/appointments\/([^/]+)\/cancel$/) && method === 'POST') {
        const aptId = pathname.split('/')[3];
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Unauthorized.' });
        }

        const db = readDb();
        const apt = db.appointments.find(a => a.id === aptId);
        if (!apt) {
          return sendJson(res, 404, { success: false, error: 'Appointment not found.' });
        }

        if (user.role !== 'practitioner' && apt.patientId !== user.id && apt.patientEmail.toLowerCase() !== user.email.toLowerCase()) {
          return sendJson(res, 403, { success: false, error: 'You are not authorized to cancel this appointment.' });
        }

        apt.status = 'cancelled';
        apt.cancelledAt = new Date().toISOString();
        writeDb(db);

        return sendJson(res, 200, { success: true, message: 'Appointment has been cancelled in accordance with clinic policies.', appointment: apt });
      }

      // 13. Reschedule Appointment
      if (pathname.match(/^\/api\/appointments\/([^/]+)\/reschedule$/) && method === 'POST') {
        const aptId = pathname.split('/')[3];
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Unauthorized.' });
        }

        const body = await parseBody(req);
        const { date, time } = body;
        if (!date || !time) {
          return sendJson(res, 400, { success: false, error: 'New date and time are required.' });
        }

        const db = readDb();
        const apt = db.appointments.find(a => a.id === aptId);
        if (!apt) {
          return sendJson(res, 404, { success: false, error: 'Appointment not found.' });
        }

        if (user.role !== 'practitioner' && apt.patientId !== user.id && apt.patientEmail.toLowerCase() !== user.email.toLowerCase()) {
          return sendJson(res, 403, { success: false, error: 'Unauthorized.' });
        }

        // Check slot conflict
        const conflict = db.appointments.some(a =>
          a.id !== aptId &&
          a.practitionerId === apt.practitionerId &&
          a.date === date &&
          a.time === time &&
          a.status !== 'cancelled'
        );

        if (conflict) {
          return sendJson(res, 409, { success: false, error: 'This time slot is already booked for this practitioner. Please pick another slot.' });
        }

        apt.date = date;
        apt.time = time;
        apt.status = 'confirmed';
        apt.rescheduledAt = new Date().toISOString();
        writeDb(db);

        return sendJson(res, 200, { success: true, message: 'Appointment successfully rescheduled.', appointment: apt });
      }

      // 14. Treatment Plans (Patient only sees authorized clinical plans)
      if (pathname === '/api/treatment-plans/my' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Please log in to view clinical treatment plans.' });
        }

        const db = readDb();
        let plans;
        if (user.role === 'practitioner') {
          plans = db.treatmentPlans;
        } else {
          plans = db.treatmentPlans.filter(tp => tp.patientId === user.id);
        }

        return sendJson(res, 200, { success: true, treatmentPlans: plans });
      }

      // 15. Herbal Prescriptions (Confidential patient health records)
      if (pathname === '/api/prescriptions/my' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Please log in to view authorized herbal prescriptions.' });
        }

        const db = readDb();
        let rxs;
        if (user.role === 'practitioner') {
          rxs = db.herbalPrescriptions;
        } else {
          rxs = db.herbalPrescriptions.filter(rx => rx.patientId === user.id);
        }

        return sendJson(res, 200, { success: true, herbalPrescriptions: rxs });
      }

      // 16. Notifications
      if (pathname === '/api/notifications/my' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Unauthorized.' });
        }

        const db = readDb();
        const list = db.notifications.filter(n => n.userId === user.id);
        return sendJson(res, 200, { success: true, notifications: list });
      }

      // 17. User Profile Update
      if (pathname === '/api/users/profile' && method === 'PUT') {
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Unauthorized.' });
        }

        const body = await parseBody(req);
        const { phone, emergencyContact, allergies, healthNotes } = body;

        const db = readDb();
        const dbUser = db.users.find(u => u.id === user.id);
        if (!dbUser) {
          return sendJson(res, 404, { success: false, error: 'User not found.' });
        }

        if (phone !== undefined) dbUser.phone = phone;
        if (emergencyContact !== undefined) dbUser.emergencyContact = emergencyContact;
        if (allergies !== undefined) dbUser.allergies = Array.isArray(allergies) ? allergies : [allergies];
        if (healthNotes !== undefined) dbUser.healthNotes = healthNotes;

        writeDb(db);
        const { passwordSalt, passwordHash, ...safeUser } = dbUser;
        return sendJson(res, 200, { success: true, message: 'Profile updated successfully.', user: safeUser });
      }

      // 18. Blog Posts
      if (pathname === '/api/blog' && method === 'GET') {
        const db = readDb();
        return sendJson(res, 200, { success: true, blogPosts: db.blogPosts });
      }

      if (pathname.startsWith('/api/blog/') && method === 'GET') {
        const blogId = pathname.replace('/api/blog/', '').trim();
        const db = readDb();
        const post = db.blogPosts.find(p => p.id === blogId);
        if (!post) {
          return sendJson(res, 404, { success: false, error: 'Blog post not found.' });
        }
        return sendJson(res, 200, { success: true, blogPost: post });
      }

      // 19. FAQs
      if (pathname === '/api/faqs' && method === 'GET') {
        const db = readDb();
        return sendJson(res, 200, { success: true, faqs: db.faqs });
      }

      // 20. Contact inquiry
      if (pathname === '/api/contact' && method === 'POST') {
        const body = await parseBody(req);
        const { name, email, phone, treatment, preferredDoctor, preferredDate, message } = body;

        if (!name || !email || !message) {
          return sendJson(res, 400, { success: false, error: 'Name, email, and message are required.' });
        }

        const db = readDb();
        const inquiry = {
          id: 'inq_' + Date.now(),
          name,
          email,
          phone: phone || '',
          treatment: treatment || 'General Inquiry',
          preferredDoctor: preferredDoctor || 'Any Available',
          preferredDate: preferredDate || '',
          message,
          receivedAt: new Date().toISOString()
        };

        if (!db.contactInquiries) db.contactInquiries = [];
        db.contactInquiries.push(inquiry);
        writeDb(db);

        return sendJson(res, 201, {
          success: true,
          message: 'Thank you for reaching out to Harmony Spring TCM Clinic. Our clinical coordinator will respond within 24 hours.'
        });
      }

      // 21. Newsletter subscription
      if (pathname === '/api/newsletter' && method === 'POST') {
        const body = await parseBody(req);
        const { email } = body;
        if (!email || !email.includes('@')) {
          return sendJson(res, 400, { success: false, error: 'A valid email address is required.' });
        }

        const db = readDb();
        if (!db.newsletterSubscribers) db.newsletterSubscribers = [];

        const normalizedEmail = email.trim().toLowerCase();
        if (!db.newsletterSubscribers.some(s => s.email === normalizedEmail)) {
          db.newsletterSubscribers.push({
            id: 'sub_' + Date.now(),
            email: normalizedEmail,
            subscribedAt: new Date().toISOString()
          });
          writeDb(db);
        }

        return sendJson(res, 200, {
          success: true,
          message: 'Thank you for subscribing to our Seasonal TCM Wellness Journal!'
        });
      }

      // Route not found in API
      return sendJson(res, 404, { success: false, error: 'API endpoint not found.' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { success: false, error: 'Internal server error: ' + err.message });
    }
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // If path doesn't have an extension, try appending .html
  if (!path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  // Normalize and check path traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Serve custom 404.html if exists
      const notFoundPath = path.join(__dirname, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
        return fs.createReadStream(notFoundPath).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(normalizedPath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Harmony Spring TCM Clinic Server running at http://localhost:${PORT}`);
});
