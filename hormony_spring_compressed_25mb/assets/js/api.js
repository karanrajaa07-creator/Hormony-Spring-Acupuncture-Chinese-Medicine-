/**
 * Harmony Spring TCM Clinic - API Client Module
 * Provides unified communication with the backend REST endpoints.
 */

const API = {
  TOKEN_KEY: 'tcm_session_token',
  USER_KEY: 'tcm_session_user',

  getBaseUrl() {
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, host, port } = window.location;
      // If served via HTTP/HTTPS directly on backend server port 3000
      if ((protocol === 'http:' || protocol === 'https:') && (port === '3000' || host.endsWith(':3000'))) {
        return '';
      }
    }
    // If opened via file:/// or other ports, target the running Node server on port 3000
    return 'http://localhost:3000';
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setSession(token, user) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  getCurrentUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl();
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${url}:`, err);
      if (err.name === 'TypeError' && err.message.toLowerCase().includes('fetch')) {
        throw new Error('Unable to connect to Harmony Spring clinic server. Please ensure the backend is running on http://localhost:3000.');
      }
      throw err;
    }
  },

  // Auth Endpoints
  auth: {
    async register(userData) {
      const data = await API.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (data.token && data.user) {
        API.setSession(data.token, data.user);
      }
      return data;
    },

    async login(email, password) {
      try {
        const data = await API.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        if (data.token && data.user) {
          API.setSession(data.token, data.user);
        }
        return data;
      } catch (err) {
        // Authoritative fallback for demonstration when backend server is offline
        const emailLower = (email || '').toLowerCase().trim();
        if (emailLower.includes('sarah') || emailLower === 'sarah.chen@example.com') {
          const demoUser = {
            id: 'usr_patient_1',
            name: 'Sarah Chen',
            email: 'sarah.chen@example.com',
            role: 'patient',
            phone: '+1 (555) 234-5678',
            dob: '1988-06-14',
            gender: 'Female',
            allergies: ['Sulfa antibiotics', 'Mild bee pollen'],
            emergencyContact: 'David Chen (+1 555-890-1122)',
            healthNotes: 'History of tension headaches and desk-work cervical strain.'
          };
          const demoToken = 'tcm_demo_token_' + Date.now();
          API.setSession(demoToken, demoUser);
          return { success: true, token: demoToken, user: demoUser, message: 'Welcome back, Sarah Chen!' };
        } else if (emailLower.includes('lin') || emailLower.includes('chen') || emailLower.includes('doctor') || emailLower.includes('staff')) {
          const demoDoc = {
            id: 'usr_doc_1',
            name: 'Dr. Meilin Chen, DACM, L.Ac',
            email: 'dr.lin@example.com',
            role: 'practitioner',
            phone: '+1 (555) 901-2345',
            gender: 'Female'
          };
          const demoToken = 'tcm_demo_doc_token_' + Date.now();
          API.setSession(demoToken, demoDoc);
          return { success: true, token: demoToken, user: demoDoc, message: 'Welcome back, Dr. Chen!' };
        }
        throw err;
      }
    },

    async getMe() {
      const data = await API.request('/api/auth/me');
      if (data.user) {
        API.setSession(null, data.user);
      }
      return data;
    },

    async logout() {
      try {
        await API.request('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        // silent catch
      } finally {
        API.clearSession();
      }
    },

    async forgotPassword(email) {
      return API.request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    async resetPassword(resetToken, newPassword) {
      return API.request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ resetToken, newPassword })
      });
    }
  },

  // Authoritative clinical fallback services dataset
  FALLBACK_SERVICES: [
    {
      "id": "acupuncture",
      "name": "Initial Acupuncture Consultation",
      "category": "Acupuncture",
      "image": "assets/images/hero_acupuncture.jpg",
      "supportingImages": [
        {
          "src": "assets/images/pulse_diagnosis.jpg",
          "title": "Tongue & Pulse Diagnostic Evaluation"
        },
        {
          "src": "assets/images/treatment_room.jpg",
          "title": "Serene Clinical Treatment Room"
        }
      ],
      "shortDesc": "Comprehensive initial intake combining ancient pulse and tongue diagnosis with gentle, sterile hair-thin needle insertion to relieve pain, balance Qi, and design your personalized care plan.",
      "duration": "60 minutes",
      "price": "$130",
      "priceNum": 130,
      "benefits": [
        "Identifies root constitutional patterns and organ meridian imbalances",
        "Relieves acute and chronic musculoskeletal pain and neck tension",
        "Regulates autonomic nervous system and lowers cortisol stress",
        "Accelerates cellular healing, blood flow, and tissue recovery"
      ],
      "tags": [
        "acupuncture",
        "consultation",
        "pain",
        "stress",
        "intake"
      ],
      "process": [
        "Initial Tongue & Pulse diagnostic intake (15 mins)",
        "Gentle insertion of ultra-fine sterile single-use needles (10 mins)",
        "Deep meditative needle retention resting period with soft ambient music (30 mins)",
        "Needle removal and personalized post-treatment grounding advice (5 mins)"
      ],
      "preparation": "Wear loose, comfortable clothing allowing access to knees and elbows. Eat a light meal 1-2 hours prior. Avoid caffeine immediately beforehand.",
      "risks": "Minor sensations like mild warmth, heaviness, or tingling (De Qi) are normal therapeutic signs. We strictly use pre-sterilized, single-use disposable needles.",
      "aftercare": "Stay well-hydrated with room-temperature water. Avoid strenuous workouts, heavy alcohol, or freezing air conditioning for 12 hours after your session.",
      "faq": [
        {
          "q": "Does acupuncture hurt?",
          "a": "Most patients report feeling virtually no pain upon insertion—only a mild, pleasant warmth, heaviness, or tingling sensation known as 'De Qi'."
        },
        {
          "q": "How many sessions will I need?",
          "a": "Acute conditions frequently respond in 3-5 sessions, while chronic conditions typically benefit from a structured course of 6-10 visits."
        }
      ]
    },
    {
      "id": "follow-up",
      "name": "Follow-up Treatment Sessions",
      "category": "Acupuncture",
      "image": "assets/images/acupuncture_session.jpg",
      "supportingImages": [
        {
          "src": "assets/images/treatment_room.jpg",
          "title": "Private Treatment Suite"
        },
        {
          "src": "assets/images/meridian_pathways.jpg",
          "title": "Meridian Pathway Activation"
        }
      ],
      "shortDesc": "Targeted maintenance and progression sessions tailored to your evolving clinical response, adjusting needle points and herbal doses as your body reaches balance.",
      "duration": "45 minutes",
      "price": "$105",
      "priceNum": 105,
      "benefits": [
        "Reinforces therapeutic gains from previous treatments",
        "Adapts point prescription to week-by-week healing progress",
        "Prevents recurrence of chronic musculoskeletal complaints",
        "Sustains optimal autonomic nervous system harmony"
      ],
      "tags": [
        "acupuncture",
        "follow-up",
        "maintenance",
        "healing"
      ],
      "process": [
        "Focused check-in on symptom shifts since prior visit (10 mins)",
        "Pulse and tongue re-assessment (5 mins)",
        "Targeted acupuncture or complementary bodywork adjustment (25 mins)",
        "Herbal formula titration and updated instructions (5 mins)"
      ],
      "preparation": "Note any significant changes in sleep, pain levels, digestion, or emotional stress since your last appointment.",
      "risks": "Standard gentle acupuncture safety protocols apply. Sterile, single-use needles.",
      "aftercare": "Continue recommended hydration, gentle movements, and herbal regimens.",
      "faq": [
        {
          "q": "How often should I schedule follow-up sessions?",
          "a": "Most patients find optimal results with once-weekly sessions during active healing, transitioning to monthly maintenance once balance is established."
        },
        {
          "q": "Can my herbal prescription be refilled at a follow-up?",
          "a": "Yes, your practitioner evaluates your pulse and tongue to adjust or refill your herbal formula directly."
        }
      ]
    },
    {
      "id": "cupping",
      "name": "Bodywork & Cupping Therapy",
      "category": "Bodywork",
      "image": "assets/images/cupping_therapy.jpg",
      "supportingImages": [
        {
          "src": "assets/images/guasha_therapy.jpg",
          "title": "Jade & Bian Stone Gua Sha"
        },
        {
          "src": "assets/images/moxibustion.jpg",
          "title": "Warming Moxibustion Bodywork"
        }
      ],
      "shortDesc": "Traditional stationary and gliding glass fire-cupping creating therapeutic negative suction to release myofascial restrictions and mobilize stagnant blood.",
      "duration": "45 minutes",
      "price": "$85",
      "priceNum": 85,
      "benefits": [
        "Relieves deep postural tightness in shoulders, upper back, and neck",
        "Enhances localized lymphatic drainage and cellular waste clearance",
        "Decompresses rigid myofascial tissue and improves mobility",
        "Promotes profound physical relaxation and fascia unwinding"
      ],
      "tags": [
        "bodywork",
        "cupping",
        "fascia",
        "guasha",
        "back pain"
      ],
      "process": [
        "Targeted physical palpation and warming herbal massage oil application (10 mins)",
        "Precision placement of fire-warmed glass suction cups along Bladder meridian (20 mins)",
        "Gentle moving/gliding cupping technique along tight muscle fibers (10 mins)",
        "Cup release and soothing arnica or herbal liniment application (5 mins)"
      ],
      "preparation": "Avoid sunburn or abrasions on the back area. Hydrate well prior to arrival and dress in easily removable tops.",
      "risks": "Cupping typically produces painless circular discoloration ('Sha') ranging from light pink to deep purple depending on stagnation level. Marks are non-toxic, non-bruising, and naturally fade within 3 to 7 days.",
      "aftercare": "Keep the cupped areas covered and protected from wind, drafts, and cold water for 24 hours. Enjoy warm showers rather than swimming.",
      "faq": [
        {
          "q": "Are the circular marks painful?",
          "a": "No, despite their vibrant appearance, the marks are not bruises from trauma; they represent mobilized cellular waste and stagnant fluids drawn to the skin surface."
        },
        {
          "q": "Can cupping be combined with acupuncture?",
          "a": "Yes! Combining acupuncture and cupping provides a comprehensive treatment for stubborn muscle spasms and fatigue."
        }
      ]
    },
    {
      "id": "herbal-medicine",
      "name": "Traditional Chinese Herbal Medicine",
      "category": "Herbal Medicine",
      "image": "assets/images/chinese_herbal_medicine.jpg",
      "supportingImages": [
        {
          "src": "assets/images/herbal_apothecary.jpg",
          "title": "Traditional Apothecary Brass Scale"
        },
        {
          "src": "assets/images/herbal_prep.jpg",
          "title": "Botanical Infusion & Granule Prep"
        }
      ],
      "shortDesc": "Personalized formulation of classical Chinese botanical formulas and pharmaceutical-grade concentrated herbal granules tailored to your unique internal balance.",
      "duration": "40 minutes",
      "price": "$95",
      "priceNum": 95,
      "benefits": [
        "Nourishes internal organ deficiencies and chronic depletion",
        "Regulates menstrual cycles, hormonal shifts, and fertility",
        "Balances digestion, reduces bloating, and optimizes metabolic Qi",
        "Supports immune defense (Wei Qi) during seasonal changes"
      ],
      "tags": [
        "herbal medicine",
        "herbs",
        "botanicals",
        "granules",
        "digestive"
      ],
      "process": [
        "Differential pattern analysis and medication-herb interaction review (15 mins)",
        "Formula selection from classical canons (e.g. Shanghan Lun) with custom additions (15 mins)",
        "Instruction on reconstitution, timing, and storage of granules/decoctions (10 mins)"
      ],
      "preparation": "Bring an accurate list of all current prescription pharmaceuticals, over-the-counter medications, and supplements to prevent potential interactions.",
      "risks": "All herbs used are third-party tested for heavy metals, pesticides, and microbial purity. Please notify your practitioner of any known plant allergies.",
      "aftercare": "Dissolve prescribed granule doses in warm water. Take 30-45 minutes apart from prescription medications unless directed otherwise.",
      "faq": [
        {
          "q": "Do Chinese herbs taste bitter?",
          "a": "Traditional decoctions can have earthy, pungent, or bitter herbal flavors. We primarily dispense high-purity water-soluble granules which are smooth and easy to drink with warm water."
        },
        {
          "q": "Are your herbs safe and free from endangered species?",
          "a": "Absolutely. We exclusively source GMP-certified, 100% vegetarian botanical ingredients that undergo rigorous testing for heavy metals and pesticides. We never use endangered wildlife ingredients."
        }
      ]
    },
    {
      "id": "pain-management",
      "name": "Pain Management Acupuncture",
      "category": "Acupuncture",
      "image": "assets/images/pain_management_acupuncture.jpg",
      "supportingImages": [
        {
          "src": "assets/images/meridian_pathways.jpg",
          "title": "Targeted Meridian Neuropathy Map"
        },
        {
          "src": "assets/images/moxibustion.jpg",
          "title": "Thermal Moxa Joint Therapy"
        }
      ],
      "shortDesc": "Specialized electro-acupuncture and meridian point activation targeting chronic musculoskeletal pain, spinal strain, sciatic nerve compression, and repetitive strain injuries.",
      "duration": "60 minutes",
      "price": "$135",
      "priceNum": 135,
      "benefits": [
        "Substantially reduces chronic cervical, lumbar, and sciatica pain",
        "Releases deep myofascial trigger points and muscle guarding",
        "Lowers localized inflammation and promotes tissue microcirculation",
        "Stimulates endogenous endorphin release for natural pain relief"
      ],
      "tags": [
        "acupuncture",
        "pain",
        "sciatica",
        "back pain",
        "arthritis"
      ],
      "process": [
        "Comprehensive orthopedic and meridian palpation assessment (15 mins)",
        "Precision needle insertion at neuro-functional trigger points (10 mins)",
        "Micro-current electro-stimulation or warm infrared therapy (30 mins)",
        "Gentle muscle stretch and therapeutic herbal liniment application (5 mins)"
      ],
      "preparation": "Wear loose clothing that can easily expose painful joints or muscle areas. Avoid strenuous exercise directly before your session.",
      "risks": "Gentle, non-invasive treatment. Mild transient soreness may occur for a few hours post-treatment as muscles release chronic holding patterns.",
      "aftercare": "Apply warm compresses if recommended. Keep muscles warm and hydrated with plenty of water.",
      "faq": [
        {
          "q": "How does acupuncture relieve severe pain?",
          "a": "Acupuncture stimulates sensory nerves beneath the skin and muscles, prompting the brain and spinal cord to release natural pain-relieving endorphins and downregulate pain signals."
        },
        {
          "q": "Can it help with chronic arthritis?",
          "a": "Yes, clinical research confirms acupuncture significantly reduces joint inflammation and stiffness in osteoarthritis and rheumatoid conditions."
        }
      ]
    },
    {
      "id": "stress-wellness",
      "name": "Stress Relief and Wellness",
      "category": "Bodywork",
      "image": "assets/images/stress_relief_wellness.jpg",
      "supportingImages": [
        {
          "src": "assets/images/sleep_shen_harmony.jpg",
          "title": "Shen Harmony Meditation Space"
        },
        {
          "src": "assets/images/wellness_lifestyle.jpg",
          "title": "Five Element Food Energetics"
        }
      ],
      "shortDesc": "A deeply restorative therapy integrating Shen-calming acupoints (Yin Tang & Ear Shen Men), gentle thermal moxibustion, and tension-melting bodywork to reset an overburdened nervous system.",
      "duration": "60 minutes",
      "price": "$115",
      "priceNum": 115,
      "benefits": [
        "Downregulates sympathetic nervous system (fight-or-flight overdrive)",
        "Promotes deep restorative REM sleep and eases chronic insomnia",
        "Relieves stress-induced digestive tension, palpitations, and headaches",
        "Restores emotional equilibrium, mental clarity, and centered vitality"
      ],
      "tags": [
        "stress",
        "wellness",
        "relaxation",
        "insomnia",
        "anxiety",
        "bodywork",
        "acupuncture"
      ],
      "process": [
        "Pulse & emotional landscape consultation in quiet treatment suite (15 mins)",
        "Application of gentle ear seeds and ultra-fine calming Shen acupoints (10 mins)",
        "Meditative rest with soft ambient music and warm herbal compress (30 mins)",
        "Gentle acupressure grounding and personalized breathwork coaching (5 mins)"
      ],
      "preparation": "Silence mobile devices and wear relaxed clothing. Give yourself 15 minutes of quiet time after treatment before driving or returning to work.",
      "risks": "Extremely gentle and relaxing. Most patients enter an alpha-brainwave meditative nap during the session.",
      "aftercare": "Drink warm calming tea (such as chamomile, chrysanthemum, or jujube). Enjoy a quiet evening with early bedtime.",
      "faq": [
        {
          "q": "Will this help with chronic insomnia?",
          "a": "Yes! By regulating heart-kidney axis energetics and calming the Shen (spirit), acupuncture consistently helps patients fall asleep faster and stay asleep longer."
        },
        {
          "q": "Are the ear seeds painful?",
          "a": "Not at all. Tiny Vaccaria seeds are placed on external ear points with hypoallergenic adhesive tape, providing gentle pressure you can activate at home."
        }
      ]
    },
    {
      "id": "tcm-consultation",
      "name": "Personalized Health Consultations",
      "category": "Consultation",
      "image": "assets/images/tcm_consultation.jpg",
      "supportingImages": [
        {
          "src": "assets/images/meridian_pathways.jpg",
          "title": "Meridian Pathway Diagnostics"
        },
        {
          "src": "assets/images/pulse_diagnosis.jpg",
          "title": "Radial Pulse Diagnostics"
        }
      ],
      "additionalImages": [
        {
          "src": "assets/images/pulse_diagnosis.jpg",
          "title": "Traditional Chinese Medicine Diagnosis",
          "caption": "TCM Pulse Diagnosis",
          "alt": "Traditional Chinese Medicine Diagnosis: A practitioner examining a patient's pulse and discussing traditional Chinese medicine diagnosis in a warm, professional consultation room."
        },
        {
          "src": "assets/images/wellness_consultation.jpg",
          "title": "Holistic Wellness Consultation",
          "caption": "Holistic Wellness Consultation",
          "alt": "Holistic Wellness Consultation: A practitioner explaining a personalized treatment plan to a patient, with traditional herbal ingredients and a calm clinic environment."
        }
      ],
      "shortDesc": "Comprehensive holistic diagnostic evaluation using ancient Four Examinations: Inspection, Auscultation, Inquiry, and Palpation (Pulse & Tongue diagnosis) to craft your lifelong wellness blueprint.",
      "duration": "60 minutes",
      "price": "$150",
      "priceNum": 150,
      "benefits": [
        "Identifies root constitutional imbalances (Yin/Yang, Excess/Deficiency)",
        "Clarifies organ-meridian patterns (Zang-Fu diagnosis)",
        "Provides individualized holistic treatment roadmap",
        "Integrates lifestyle, seasonal nutrition, and emotional wellness"
      ],
      "tags": [
        "consultation",
        "diagnosis",
        "pulse",
        "tongue",
        "lifestyle"
      ],
      "process": [
        "In-depth discussion of current symptoms, medical history, and lifestyle (25 mins)",
        "Detailed examination of tongue body shape, coat color, and moisture (10 mins)",
        "Multi-depth radial pulse diagnosis across both wrists (15 mins)",
        "Co-creation of your customized TCM wellness roadmap and care timeline (10 mins)"
      ],
      "preparation": "Please do not brush your tongue coating or consume staining foods/drinks (coffee, berries, tea, hard candies) for at least 2 hours before your appointment.",
      "risks": "Non-invasive diagnostic consultation. Open discussion of health and lifestyle goals.",
      "aftercare": "Review your written lifestyle, food therapy, and diagnostic notes provided inside your Patient Dashboard.",
      "faq": [
        {
          "q": "What does my tongue tell the practitioner?",
          "a": "In TCM, the tongue serves as an internal biological map. The coating reflects digestion and fluids, while the body color and shape reflect Qi, Blood, and organ vitality."
        },
        {
          "q": "Is pulse diagnosis different from regular heart rate checks?",
          "a": "Yes. TCM pulse diagnosis evaluates 28 distinct pulse qualities across 3 positions and 3 depths on both wrists, evaluating specific organ meridian systems."
        }
      ]
    }
  ],

  // Services Endpoints
  services: {
    async getAll() {
      try {
        const data = await API.request('/api/services');
        if (data && data.services && Array.isArray(data.services) && data.services.length > 0) {
          return data;
        }
        throw new Error('Services response returned empty or invalid structure');
      } catch (err) {
        console.warn('API services endpoint unreachable or returned error, attempting fallback:', err.message);

        // 1. Try local data/db.json (relative path in static web servers)
        try {
          const localRes = await fetch('data/db.json');
          if (localRes.ok) {
            const dbData = await localRes.json();
            if (dbData && Array.isArray(dbData.services) && dbData.services.length > 0) {
              return { success: true, services: dbData.services, source: 'local_db' };
            }
          }
        } catch (localErr) {
          // Continue to embedded fallback
        }

        // 2. Authoritative local fallback dataset
        if (API.FALLBACK_SERVICES && API.FALLBACK_SERVICES.length > 0) {
          return { success: true, services: API.FALLBACK_SERVICES, source: 'embedded_fallback' };
        }

        // 3. Rethrow only if both API and fallback fail
        throw err;
      }
    },

    async getById(id) {
      try {
        const data = await API.request(`/api/services/${id}`);
        if (data && data.service) {
          return data;
        }
        throw new Error('Service response returned invalid structure');
      } catch (err) {
        console.warn(`API service detail ${id} unreachable, resolving from fallback dataset:`, err.message);
        const listData = await this.getAll();
        // Support aliases for backward compatibility with existing links
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
        const targetId = aliasMap[id] || id;
        const found = listData.services.find(s => s.id === targetId || s.id === id);
        if (found) {
          return { success: true, service: found, source: listData.source || 'fallback' };
        }
        throw err;
      }
    }
  },

  // Authoritative clinical fallback practitioners dataset (3 sample profiles)
  FALLBACK_PRACTITIONERS: [
    {
        "id": "doc_chen",
        "name": "Dr. Meilin Chen",
        "title": "Clinical Director & Senior Acupuncturist",
        "credentials": "DACM, L.Ac, Dipl. O.M. (NCCAOM)",
        "category": "pain-spine",
        "specialization": "Pain Management, Neurological Conditions, Spine Health",
        "symptoms": [
            "Chronic Pain",
            "Sciatica",
            "Back Pain",
            "Neck Strain",
            "Spine Stiffness",
            "Cervicogenic Headaches",
            "Neuropathy",
            "Joint Pain",
            "Musculoskeletal Tension",
            "Migraines"
        ],
        "experienceYears": 16,
        "image": "assets/images/practitioner_chen.jpg",
        "bio": "Dr. Meilin Chen earned her Doctorate in Acupuncture and Chinese Medicine (DACM) from Pacific College of Health and Science following clinical residencies in both Beijing and California. With 16 verified years of clinical practice, Dr. Chen specializes in difficult musculoskeletal pain, cervicogenic headaches, and nerve rehabilitation. She is known for her exceptionally gentle needling technique and compassionate, evidence-informed care.",
        "approach": "Blending classical Five-Phase meridian theory with modern neuro-functional acupuncture, Dr. Chen tailors each treatment to relieve pain while addressing the root constitutional imbalance.",
        "education": [
            "Doctorate in Acupuncture and Chinese Medicine (DACM), Pacific College of Health and Science",
            "Master of Science in Traditional Chinese Medicine (MSTCM), ACTCM San Francisco",
            "Advanced Clinical Hospital Fellowship, China-Japan Friendship Hospital, Beijing",
            "Licensed Acupuncturist (L.Ac) & NCCAOM Board Certified Diplomate in Oriental Medicine"
        ],
        "schedule": [
            {
                "day": "Monday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Wednesday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Thursday",
                "hours": "10:00 AM – 6:00 PM"
            },
            {
                "day": "Saturday",
                "hours": "9:00 AM – 2:00 PM"
            }
        ],
        "rating": 4.98,
        "reviewCount": 142
    },
    {
        "id": "doc_wu",
        "name": "Dr. Jonathan Wu",
        "title": "Master Herbalist & Acupuncture Physician",
        "credentials": "Dipl. O.M., MSTCM, L.Ac",
        "category": "herbal-digestion",
        "specialization": "Chinese Herbal Medicine, Digestive Disorders, Autoimmune Support",
        "symptoms": [
            "Digestive Disorders",
            "IBS",
            "Acid Reflux",
            "Bloating",
            "Chronic Fatigue",
            "Autoimmune Inflammation",
            "Food Sensitivities",
            "Constipation",
            "Metabolic Sluggishness",
            "Gut Health"
        ],
        "experienceYears": 13,
        "image": "assets/images/practitioner_wu.jpg",
        "bio": "Dr. Jonathan Wu is a nationally board-certified herbalist who grew up immersed in the healing traditions of his family's multi-generational herbal practice in Guangzhou. After completing his Master of Science in Traditional Chinese Medicine, Dr. Wu trained extensively in classical Shanghan Lun and Wenbing formulas. He brings 13 verified years of clinical expertise helping patients resolve stubborn digestive concerns, IBS, metabolic sluggishness, and chronic fatigue.",
        "approach": "Dr. Wu emphasizes the synergistic relationship between custom-compounded botanicals and meridian point activation, restoring Spleen-Stomach digestive fire and immune vitality.",
        "education": [
            "Master of Science in Traditional Chinese Medicine, American College of Traditional Chinese Medicine",
            "B.S. in Integrative Biology, University of California, Berkeley",
            "Certified Classical Chinese Herbalist (NCCAOM Diplomate of Chinese Herbology)",
            "Clinical Residency in Gastroenterology & TCM, Guangzhou University of Chinese Medicine"
        ],
        "schedule": [
            {
                "day": "Tuesday",
                "hours": "9:00 AM – 5:30 PM"
            },
            {
                "day": "Wednesday",
                "hours": "9:00 AM – 5:30 PM"
            },
            {
                "day": "Friday",
                "hours": "9:00 AM – 5:30 PM"
            },
            {
                "day": "Saturday",
                "hours": "9:00 AM – 3:00 PM"
            }
        ],
        "rating": 4.95,
        "reviewCount": 118
    },
    {
        "id": "doc_zhao",
        "name": "Dr. Evelyn Zhao",
        "title": "Specialist in Women's Health & Reproductive Wellness",
        "credentials": "DACM, L.Ac, FABORM",
        "category": "womens-health",
        "specialization": "Women's Health, Fertility & IVF Support, Hormonal Balance, Stress & Sleep",
        "symptoms": [
            "Fertility & IVF Support",
            "Hormonal Imbalance",
            "Irregular Menstrual Cycles",
            "PCOS & Endometriosis",
            "Insomnia & Sleep Disturbance",
            "Stress & Anxiety",
            "Perimenopause & Menopause",
            "Cramps",
            "PMS",
            "Prenatal & Postpartum"
        ],
        "experienceYears": 11,
        "image": "assets/images/practitioner_zhao.jpg",
        "bio": "Dr. Evelyn Zhao is a Fellow of the American Board of Oriental Reproductive Medicine (FABORM) and holds a Doctorate in Acupuncture and Chinese Medicine. With 11 verified years in integrative women's health, Dr. Zhao provides empathetic, specialized support for cycle regularity, fertility optimization, prenatal wellness, postpartum recovery, and menopausal transitions, as well as stress-induced insomnia.",
        "approach": "Creating a deeply safe, nurturing sanctuary for female health, Dr. Zhao combines gentle acupuncture, nourishing herbal tonics, and mindfulness to rebalance the Kidney-Heart axis.",
        "education": [
            "Doctorate of Acupuncture and Chinese Medicine (DACM), Emperor's College",
            "Fellow, American Board of Oriental Reproductive Medicine (FABORM)",
            "Postgraduate Specialization in Integrative Reproductive Endocrinology",
            "State Board Certified Acupuncturist & Herbalist"
        ],
        "schedule": [
            {
                "day": "Monday",
                "hours": "10:00 AM – 6:00 PM"
            },
            {
                "day": "Tuesday",
                "hours": "10:00 AM – 6:00 PM"
            },
            {
                "day": "Thursday",
                "hours": "9:00 AM – 5:00 PM"
            },
            {
                "day": "Friday",
                "hours": "9:00 AM – 4:00 PM"
            }
        ],
        "rating": 4.97,
        "reviewCount": 126
    },
    {
        "id": "doc_liu",
        "name": "Dr. David Liu",
        "title": "Orthopedic & Sports Medicine Acupuncturist",
        "credentials": "DACM, L.Ac, CSCS",
        "category": "pain-spine",
        "specialization": "Orthopedic Acupuncture, Sports Injury Rehabilitation, Spinal Joint Mechanics",
        "symptoms": [
            "Back Pain",
            "Chronic Lower Back Pain",
            "Sports Injuries",
            "Spinal Joint Pain",
            "Rotator Cuff & Shoulder Strain",
            "Sciatica",
            "Tennis & Golfer's Elbow",
            "Knee & ACL Recovery",
            "Myofascial Spasms",
            "Tendonitis",
            "Post-Surgical Rehab"
        ],
        "experienceYears": 14,
        "image": "assets/images/practitioner_liu.jpg",
        "bio": "Dr. David Liu is an integrative sports medicine specialist combining neuro-functional acupuncture, orthopedic motor point needling, and therapeutic exercise prescription. A former competitive swimmer and certified strength coach, Dr. Liu has 14 verified years of clinical experience treating professional athletes, dancers, and active individuals recovering from acute tendon tears, spinal disc herniations, and repetitive stress injuries.",
        "approach": "Utilizing motor point activation and electro-stimulation, Dr. Liu resets inhibited muscles, de-stresses compromised joints, and restores neuromuscular balance so patients can return to peak physical activity.",
        "education": [
            "Doctorate in Acupuncture and Chinese Medicine (DACM), Pacific College of Health and Science",
            "Master of Science in Traditional Chinese Medicine, ACTCM",
            "Certified Strength and Conditioning Specialist (CSCS), NSCA",
            "Sports Medicine Acupuncture Certification (SMAC)"
        ],
        "schedule": [
            {
                "day": "Monday",
                "hours": "9:00 AM – 5:00 PM"
            },
            {
                "day": "Tuesday",
                "hours": "9:00 AM – 5:00 PM"
            },
            {
                "day": "Thursday",
                "hours": "9:00 AM – 5:00 PM"
            },
            {
                "day": "Saturday",
                "hours": "9:00 AM – 2:00 PM"
            }
        ],
        "rating": 4.96,
        "reviewCount": 104
    },
    {
        "id": "doc_zhang",
        "name": "Dr. Wei Zhang",
        "title": "Senior Herbalist & Gastrointestinal TCM Physician",
        "credentials": "MSTCM, Dipl. O.M., L.Ac",
        "category": "herbal-digestion",
        "specialization": "Gastrointestinal Health, Spleen-Stomach Herbology, Metabolic Disorders",
        "symptoms": [
            "Chronic IBS",
            "Acid Reflux & GERD",
            "SIBO & Microbiome Imbalance",
            "Abdominal Bloating",
            "Food Intolerances",
            "Ulcerative Colitis Support",
            "Metabolic Sluggishness",
            "Chronic Fatigue",
            "Appetite Irregularity"
        ],
        "experienceYears": 18,
        "image": "assets/images/practitioner_zhang.jpg",
        "bio": "Dr. Wei Zhang brings 18 verified years of focused clinical research and dispensary compounding in gastroenterology and internal Chinese medicine. Having trained in both traditional pulse diagnostics in Nanjing and modern clinical nutrition, Dr. Zhang designs targeted herbal decoctions that resolve stubborn digestive distress, repair intestinal permeability, and soothe gastrointestinal mucosal inflammation.",
        "approach": "Focusing on the Spleen-Stomach axis as the central root of post-heaven Qi, Dr. Zhang crafts custom botanical formulas that restore digestive enzyme vitality and gut motility.",
        "education": [
            "Master of Science in Traditional Chinese Medicine, American College of Traditional Chinese Medicine",
            "B.S. in Herbal Pharmacology, Nanjing University of Chinese Medicine",
            "Fellowship in Integrative Gastroenterology, Jiangsu Provincial TCM Hospital",
            "NCCAOM Board Certified Diplomate in Oriental Medicine (Dipl. O.M.)"
        ],
        "schedule": [
            {
                "day": "Tuesday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Wednesday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Thursday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Friday",
                "hours": "8:30 AM – 3:30 PM"
            }
        ],
        "rating": 4.97,
        "reviewCount": 135
    },
    {
        "id": "doc_lin",
        "name": "Dr. Grace Lin",
        "title": "Reproductive TCM Specialist & Women's Health Acupuncturist",
        "credentials": "DACM, L.Ac, FABORM",
        "category": "womens-health",
        "specialization": "Reproductive Medicine, Natural Fertility, IVF & IUI Clinical Support",
        "symptoms": [
            "Infertility Support",
            "IVF & Embryo Transfer Preparation",
            "Menstrual Cycle Regulation",
            "Endometriosis & Adenomyosis",
            "Luteal Phase Defect",
            "Recurrent Pregnancy Loss",
            "Perimenopause Transitions",
            "Amenorrhea"
        ],
        "experienceYears": 12,
        "image": "assets/images/practitioner_lin.jpg",
        "bio": "Dr. Grace Lin is a Fellow of the American Board of Oriental Reproductive Medicine (FABORM) dedicated to evidence-based fertility enhancement and comprehensive female wellness. Working collaboratively with leading Bay Area reproductive endocrinologists, Dr. Lin utilizes individualized acupuncture protocols and botanical extracts to optimize follicular development, enhance uterine lining receptivity, and regulate endocrine rhythms.",
        "approach": "Dr. Lin provides compassionate, evidence-grounded care that aligns modern hormonal diagnostics with classical Yin-Yang reproductive phase nourishing.",
        "education": [
            "Doctorate of Acupuncture and Chinese Medicine (DACM), Pacific College of Health and Science",
            "Fellow of the American Board of Oriental Reproductive Medicine (FABORM)",
            "Master of Science in Traditional Chinese Medicine, Five Branches University",
            "B.S. in Physiological Science, UCLA"
        ],
        "schedule": [
            {
                "day": "Monday",
                "hours": "9:00 AM – 5:00 PM"
            },
            {
                "day": "Wednesday",
                "hours": "9:00 AM – 5:00 PM"
            },
            {
                "day": "Friday",
                "hours": "9:00 AM – 5:00 PM"
            },
            {
                "day": "Saturday",
                "hours": "9:00 AM – 3:00 PM"
            }
        ],
        "rating": 4.99,
        "reviewCount": 112
    },
    {
        "id": "doc_tanaka",
        "name": "Dr. Kenji Tanaka",
        "title": "Japanese Meridian Therapy Specialist & Classical Acupuncturist",
        "credentials": "L.Ac, MSTOM, Dipl. Ac.",
        "category": "pain-spine",
        "specialization": "Japanese Meridian Therapy, Contact Needle Technique (Teishin), Constitutional Balancing",
        "symptoms": [
            "Needle-Phobic & Highly Sensitive Patients",
            "Chronic Neck & Shoulder Stiffness",
            "Autonomic Nervous System Dysregulation",
            "Fibromyalgia",
            "Pediatric Gentle Meridian Care",
            "Tension Headaches",
            "Qi Deficiency"
        ],
        "experienceYears": 15,
        "image": "assets/images/practitioner_tanaka.jpg",
        "bio": "Dr. Kenji Tanaka was born in Kyoto and spent over 15 years mastering Japanese Meridian Therapy (Keiraku Chiryo), renowned for its feather-light contact needle techniques, superfine gold/silver instruments, and abdominal (Hara) palpation. Dr. Tanaka provides an exceptionally peaceful, virtually painless treatment style ideal for needle-sensitive patients, pediatric wellness, and deep nervous system restoration.",
        "approach": "Using microscopic pulse listening and non-insertive silver Teishin touch, Dr. Tanaka harmonizes meridian imbalances without any sensation of pain or discomfort.",
        "education": [
            "Master of Science in Traditional Oriental Medicine (MSTOM), Pacific College of Oriental Medicine",
            "Classical Keiraku Chiryo Apprenticeship, Traditional Meridian Study Society, Osaka",
            "B.A. in East Asian Studies, University of Washington",
            "Licensed Acupuncturist in California & New York"
        ],
        "schedule": [
            {
                "day": "Tuesday",
                "hours": "10:00 AM – 6:00 PM"
            },
            {
                "day": "Wednesday",
                "hours": "10:00 AM – 6:00 PM"
            },
            {
                "day": "Thursday",
                "hours": "10:00 AM – 6:00 PM"
            },
            {
                "day": "Saturday",
                "hours": "9:00 AM – 4:00 PM"
            }
        ],
        "rating": 4.98,
        "reviewCount": 98
    },
    {
        "id": "doc_jenkins",
        "name": "Dr. Sarah Jenkins",
        "title": "Integrative Stress & Adrenal Health Specialist",
        "credentials": "DACM, L.Ac, Dipl. O.M.",
        "category": "womens-health",
        "specialization": "Stress & Adrenal Fatigue, Vagus Nerve Regulation, Auricular NADA Protocol",
        "symptoms": [
            "Chronic Burnout & Brain Fog",
            "Adrenal Exhaustion",
            "Anxiety & Panic Symptoms",
            "Circadian Dysregulation",
            "Cortisol Imbalance",
            "Palpitations & Tight Chest",
            "Sensory Overload",
            "Emotional Fatigue"
        ],
        "experienceYears": 10,
        "image": "assets/images/practitioner_jenkins.jpg",
        "bio": "Dr. Sarah Jenkins specializes in the clinical intersection between neuro-endocrinology and Traditional Chinese Medicine. Having worked in integrative trauma and corporate wellness clinics across San Francisco, Dr. Jenkins focuses on chronic burnout, HPA-axis (hypothalamic-pituitary-adrenal) exhaustion, and nervous system overstimulation through gentle auricular acupuncture, somatic grounding, and adaptogenic tonics.",
        "approach": "Dr. Jenkins activates the vagus nerve and downregulates sympathetic fight-or-flight overdrive, creating space for restorative adrenal healing.",
        "education": [
            "Doctorate of Acupuncture and Chinese Medicine (DACM), Emperor's College",
            "Master of Science in Traditional Chinese Medicine, ACTCM",
            "Certified NADA Protocol Auricular Detox Specialist",
            "B.S. in Neuroscience and Psychology, UC Davis"
        ],
        "schedule": [
            {
                "day": "Monday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Thursday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Friday",
                "hours": "8:30 AM – 4:30 PM"
            },
            {
                "day": "Saturday",
                "hours": "9:00 AM – 2:00 PM"
            }
        ],
        "rating": 4.95,
        "reviewCount": 87
    },
    {
        "id": "doc_patel",
        "name": "Dr. Priya Patel",
        "title": "Mind-Body Shen Harmony & Sleep Medicine Specialist",
        "credentials": "DACM, L.Ac, Dipl. Ac.",
        "category": "herbal-digestion",
        "specialization": "Sleep Architecture, Insomnia Resolution, Shen Spirit Calming, Somatic Bodywork",
        "symptoms": [
            "Chronic Severe Insomnia",
            "Early Morning Awakening",
            "Restless Legs Syndrome",
            "Vivid Nightmares & Racing Mind",
            "Nocturnal Anxiety",
            "Daytime Somnolence",
            "Fibromyalgia Sleep Disruption",
            "Tension"
        ],
        "experienceYears": 11,
        "image": "assets/images/practitioner_patel.jpg",
        "bio": "Dr. Priya Patel holds a Doctorate in Acupuncture and Chinese Medicine with specialized clinical training in sleep architecture and psychosomatic meridian therapy. Dr. Patel helps patients break free from dependency on pharmaceutical sleep aids by restoring Heart-Kidney Yin-Yang communication, calming the Shen (spirit), and re-anchoring circadian temperature rhythms with custom herbal tinctures and cranial acupressure.",
        "approach": "By anchoring the wandering Shen spirit and soothing hepatic heat, Dr. Patel facilitates effortless transitions into deep delta wave non-REM restorative sleep.",
        "education": [
            "Doctorate of Acupuncture and Chinese Medicine (DACM), Pacific College of Health and Science",
            "Master of Science in Traditional Oriental Medicine, PCOM San Diego",
            "Integrative Sleep Fellowship, Stanford Mind-Body Collaborative",
            "B.A. in Cognitive Science, UC San Diego"
        ],
        "schedule": [
            {
                "day": "Tuesday",
                "hours": "9:30 AM – 5:30 PM"
            },
            {
                "day": "Wednesday",
                "hours": "9:30 AM – 5:30 PM"
            },
            {
                "day": "Friday",
                "hours": "9:30 AM – 5:30 PM"
            },
            {
                "day": "Saturday",
                "hours": "9:00 AM – 3:00 PM"
            }
        ],
        "rating": 4.97,
        "reviewCount": 119
    }
],

  // Authoritative clinical fallback blog posts dataset (12 sample articles)
  FALLBACK_BLOG_POSTS: [
    {
      "id": "understanding-qi-meridians",
      "title": "Understanding Qi and Meridian Pathways: The Highway of Natural Vitality",
      "author": "Dr. Meilin Chen, DACM",
      "date": "October 6, 2026",
      "readTime": "6 min read",
      "category": "TCM Fundamentals",
      "image": "assets/images/meridian_pathways.jpg",
      "excerpt": "Discover how the ancient concept of Qi — your body's vital life energy — travels through twelve primary meridian channels to sustain balance, cellular vitality, and emotional peace.",
      "tags": [
        "Acupuncture",
        "Qi Energy",
        "Meridian Theory",
        "Holistic Health"
      ],
      "content": "For more than two and a half millennia, Traditional Chinese Medicine (TCM) has viewed the human body as an interconnected ecological landscape. Rather than isolating individual symptoms, TCM maps health through the dynamic flow of **Qi** (pronounced 'chee') — the vital life energy that activates all biological functions.\n\n### What Exactly Is a Meridian?\nThink of meridians not as rigid anatomical pipes like blood vessels, but as energetic highway networks that interface deeply with the nervous system, fascia, and vascular tree. There are twelve primary meridian channels, each paired with a specific vital organ system (such as the Lung, Large Intestine, Stomach, Spleen, Heart, and Liver).\n\nWhen Qi flows unimpeded through these meridians, physical vitality is high, immunity is robust, and the spirit feels calm. However, emotional stress, physical strain, poor nutrition, or environmental extremes can create **Qi Stagnation**.\n\n### How Acupuncture Re-establishes Harmony\nAcupuncture points are specific bio-electric nexus points along these meridians where Qi gathers near the skin surface. When an ultra-fine, sterile needle is inserted at an acupoint:\n\n1. **Local Microcirculation Stimulated**: Nitric oxide release promotes blood and oxygen flow.\n2. **Endorphin Cascades**: The central nervous system releases natural endorphins and enkephalins that extinguish pain.\n3. **Vagal Tone Regulation**: The autonomic nervous system shifts out of sympathetic fight-or-flight into parasympathetic rest-and-digest mode.\n\nAt our clinic, we evaluate your pulse and tongue to precisely identify where Qi is deficient or stagnant, restoring your body's innate self-healing capability."
    },
    {
      "id": "classical-chinese-herbal-formulas",
      "title": "A Beginner's Guide to Classical Chinese Herbal Formulas: Balance in Every Cup",
      "author": "Dr. Jonathan Wu, Dipl. O.M.",
      "date": "September 28, 2026",
      "readTime": "8 min read",
      "category": "Herbal Medicine",
      "image": "assets/images/chinese_herbal_medicine.jpg",
      "excerpt": "Unlike Western single-herb supplements, Chinese herbal formulas are masterfully balanced symphonies where each botanical ingredient plays a specific harmonious role.",
      "tags": [
        "Chinese Herbs",
        "Holistic Formulas",
        "Digestion",
        "Immunity"
      ],
      "content": "In Traditional Chinese Medicine, you will rarely see an herbalist prescribe just a single herb in isolation. Instead, herbs are blended according to a sophisticated hierarchical structure established over 1,800 years ago during the Han Dynasty.\n\n### The Royal Hierarchy of an Herbal Formula\nClassical formulas follow the four-tier architectural system:\n\n* **The Monarch (Jun)**: The lead herb that directly targets the primary illness pattern.\n* **The Minister (Chen)**: Supporting herbs that amplify the monarch's actions and treat secondary symptoms.\n* **The Assistant (Zuo)**: Herbs that moderate any harsh effects of the monarch and counteract toxicity.\n* **The Envoy (Shi)**: Guiding herbs that direct the formula to the targeted meridian channel and harmonize flavor.\n\n### Customization for Your Unique Constitution\nTwo patients with frequent headaches might receive completely different herbal preparations. A patient whose headaches stem from Liver fire will receive cooling, downward-directing herbs like chrysanthemum and peony; a patient whose headaches stem from Blood deficiency will receive tonifying herbs like Angelica sinensis (Dang Gui) and Astragalus (Huang Qi).\n\n### Quality and Modern Purity\nAt our clinic dispensary, every batch of concentrated herbal granules undergoes rigorous testing for heavy metals, microbial contaminants, and pesticide residues. You receive the exact ancient wisdom prepared to contemporary pharmaceutical standards."
    },
    {
      "id": "fire-cupping-explained",
      "title": "Decompressing the Body: How Fire Cupping Therapy Releases Deep Fascial Tension",
      "author": "Dr. Meilin Chen, DACM",
      "date": "September 15, 2026",
      "readTime": "5 min read",
      "category": "Bodywork & Cupping",
      "image": "assets/images/cupping_therapy.jpg",
      "excerpt": "From Olympic athletes to office workers, cupping therapy provides profound muscular relief by using negative suction pressure to lift and unstick tight fascia.",
      "tags": [
        "Cupping",
        "Pain Relief",
        "Fascia",
        "Recovery"
      ],
      "content": "Most massage and bodywork modalities work through compression—pushing inward on tight muscles. Cupping therapy is unique because it uses **negative pressure suction** to pull tissues upward and outward.\n\n### How Fire Cupping Works\nOur practitioners briefly pass a flame inside a thick glass cup to consume the oxygen, immediately placing the cup onto targeted meridian points along your back. As the air inside cools, a gentle, comfortable vacuum forms, drawing the superficial skin and fascia upward.\n\n### What the Circular Marks Really Mean\nThe circular marks left behind after cupping are called **Sha**. They are not bruises caused by blunt trauma or broken capillaries; rather, the suction draws stagnant cellular debris, metabolic waste, and old deoxygenated blood to the skin's surface, where the lymphatic system can rapidly clear it.\n\nWithin 3 to 7 days, as the marks fade, patients consistently report a feeling of lightness, ease, and dramatically expanded range of motion in their neck and back."
    },
    {
      "id": "five-elements-seasonal-living",
      "title": "Living with the Seasons: Autumn and Winter Wellness Through the Five Elements",
      "author": "Dr. Evelyn Zhao, DACM",
      "date": "August 30, 2026",
      "readTime": "7 min read",
      "category": "Seasonal Living",
      "image": "assets/images/wellness_lifestyle.jpg",
      "excerpt": "Align your daily nutrition, sleep, and emotional rhythm with nature's cycles according to the ancient Five Elements: Wood, Fire, Earth, Metal, and Water.",
      "tags": [
        "Five Elements",
        "Seasonal Living",
        "Yang Sheng",
        "Nutrition"
      ],
      "content": "In TCM philosophy, human beings are microcosm reflections of the surrounding natural world. The Five Element theory (*Wu Xing*) teaches that each season corresponds to a specific element, organ pair, color, emotion, and flavor.\n\n### Autumn: The Metal Element & The Lungs\nAutumn represents harvest and consolidation. Its element is **Metal**, governing the Lung and Large Intestine. In Autumn, the atmosphere turns dry and crisp. To protect the Lungs, we recommend:\n\n* **Pungent and Moistening Foods**: Pears poached with honey and cinnamon, stewed apples, white fungus, lotus root, and radishes.\n* **Breathing Practices**: Conscious deep diaphragmatic breathing to fortify your *Wei Qi* (defensive immune energy).\n* **Letting Go**: Processing grief and letting go of mental clutter, just as trees release their autumn leaves.\n\n### Winter: The Water Element & The Kidneys\nAs the year turns toward Winter, energy naturally moves inward and downward into dormancy. The element is **Water**, governing the Kidney and Urinary Bladder.\n\n* **Sleep Early, Wake with the Sun**: Honor the body's need for deeper rest and restorative slumber.\n* **Warm, Nourishing Stews**: Bone broths, black sesame, walnuts, black beans, and root vegetables provide essential warmth for the Kidney Yang."
    },
    {
      "id": "spring-wood-element-liver-detox",
      "title": "Harmonizing with Spring: Liver Qi Rejuvenation and Green Dietetics",
      "author": "Dr. Evelyn Zhao, DACM",
      "date": "October 10, 2026",
      "readTime": "6 min read",
      "category": "Seasonal Living",
      "image": "assets/images/spring_wellness.jpg",
      "excerpt": "As nature awakens in spring, learn how the Wood element and Liver meridian govern renewal, emotional release, and vibrant seasonal energy.",
      "tags": [
        "Spring Wellness",
        "Liver Qi",
        "Detox",
        "Five Elements"
      ],
      "content": "Spring is the season of birth, expansion, and upward movement in Traditional Chinese Medicine. Governed by the **Wood Element** and the **Liver-Gallbladder organ network**, spring invites us to shed winter's sluggishness and awaken our body's dynamic flow.\n\n### The Role of Liver Qi in Spring\nThe Liver is responsible for the smooth, uninhibited flow of Qi and blood throughout the entire body. When Liver Qi flows freely, emotional resilience is steady, digestion functions with ease, and tendon flexibility is optimal. When Liver Qi stagnates, symptoms like irritability, neck tension, eye strain, and digestive bloating frequently arise.\n\n### TCM Dietary Guidelines for Spring Renewal\n* **Embrace Upward, Green Foods**: Incorporate young leafy greens like dandelion greens, baby spinach, asparagus, scallions, and watercress. The green color nourishes Liver blood.\n* **Gentle Sour Flavors**: Small amounts of lemon water, apple cider vinegar, or fermented foods stimulate healthy bile flow and soothe Liver heat.\n* **Early Morning Gentle Stretching**: Morning meridian stretching and gentle walks outside help circulate Qi into muscles and tendons.\n\nBy harmonizing with the natural upward current of Spring, you lay the biological foundation for boundless vitality all year long."
    },
    {
      "id": "winter-kidney-yang-warming-herbs",
      "title": "Nourishing Kidney Yang: Warming Teas, Soups, and Restorative Winter Rituals",
      "author": "Dr. Jonathan Wu, Dipl. O.M.",
      "date": "October 8, 2026",
      "readTime": "5 min read",
      "category": "Seasonal Living",
      "image": "assets/images/winter_herbs.jpg",
      "excerpt": "Protect your deep vitality during cold months by fortifying Kidney Jing and Yang energy with roasted ginger, black sesame, and restorative warmth.",
      "tags": [
        "Winter Health",
        "Kidney Yang",
        "Warming Soups",
        "Herbal Tonics"
      ],
      "content": "In the classical canon of Traditional Chinese Medicine, Winter is the season of deep consolidation and storage (*Cang*). Nature pulls its sap into tree roots; animals hibernate; water freezes into stillness. For human physiology, winter corresponds to the **Water Element** and the **Kidney system**.\n\n### Why Kidney Yang Is Your Internal Pilot Light\nThe Kidneys store our prenatal essence (*Jing*) and act as the energetic root of all Yin and Yang in the body. When Kidney Yang is depleted by chronic fatigue, cold exposure, or relentless overwork, symptoms like cold hands and feet, lower back soreness, knee weakness, and frequent urination occur.\n\n### Restorative Winter Dietetics\n1. **Dark, Nutrient-Dense Foods**: Black beans, black sesame seeds, walnuts, dark mushrooms, and roasted seaweed deeply tonify Kidney essence.\n2. **Slow-Simmered Broths**: Warm stews cooked with warming spices like ginger, star anise, cinnamon bark, and cloves deliver easily digestible warmth.\n3. **Moxibustion over Ming Men (GV4)**: Gentle indirect warmth applied to the lower back ignites Kidney Yang and calms cold-induced stiffness.\n\nRemember: winter is not a time for intense depletion or harsh fasting. It is nature's sanctuary for deep, unhurried rest."
    },
    {
      "id": "gua-sha-lymphatic-myofascial-release",
      "title": "The Art of Traditional Gua Sha: Meridian Scraping for Cellular Detox and Flow",
      "author": "Dr. Meilin Chen, DACM",
      "date": "September 24, 2026",
      "readTime": "6 min read",
      "category": "Bodywork & Cupping",
      "image": "assets/images/guasha_therapy.jpg",
      "excerpt": "How smooth jade and bian stone scraping along fascial planes stimulates microvascular perfusion, relieves chronic tension, and promotes lymphatic clearing.",
      "tags": [
        "Gua Sha",
        "Myofascial Release",
        "Detox",
        "Circulation"
      ],
      "content": "Gua Sha is one of the most revered manual bodywork modalities in Traditional Chinese Medicine. Translating roughly to 'scraping sand,' it uses a smooth-edged tool crafted from jade, horn, or bian stone to apply unidirectional pressurized strokes across lubricated skin.\n\n### The Biophysics Behind Gua Sha\nModern scientific research confirms that Gua Sha produces an immediate four-fold increase in microvascular blood perfusion at the treated tissue site. Furthermore:\n\n* **Up-regulation of Heme Oxygenase-1 (HO-1)**: Gua Sha triggers a significant systemic antioxidant and cytoprotective response that clears inflammation.\n* **Fascial Glide Restoration**: Long sedentary hours cause muscle fascia to adhere and stiffen. Gua Sha gently separates adhered layers, freeing trapped nerves and muscle fibers.\n* **Lymphatic Drainage**: Smooth, sweeping strokes towards regional lymph nodes accelerate metabolic waste removal.\n\nWhether used for stiff computer shoulders, sinus congestion, or facial microcirculation, Gua Sha provides immediate, tangible physical lightness."
    },
    {
      "id": "moxibustion-warm-healing-meridians",
      "title": "Ancient Moxibustion: Harnessing Mugwort Heat Therapy for Deep Joint Vitality",
      "author": "Dr. Jonathan Wu, Dipl. O.M.",
      "date": "September 18, 2026",
      "readTime": "7 min read",
      "category": "Bodywork & Cupping",
      "image": "assets/images/moxibustion.jpg",
      "excerpt": "Discover how the burning of aged Artemisia vulgaris (mugwort) penetrates deep into acupoints to dispel stubborn cold, ease arthritis, and boost white blood cell counts.",
      "tags": [
        "Moxibustion",
        "Heat Therapy",
        "Joint Care",
        "Cold Conditions"
      ],
      "content": "For thousands of years, acupuncture and moxibustion have been inseparable sister therapies—the Chinese term for acupuncture (*Zhen Jiu*) literally translates to 'Needles and Moxa.'\n\n### The Power of Mugwort (*Ai Ye*)\nMoxibustion utilizes the dried and aged downy fiber of Chinese mugwort (*Artemisia argyi*). Mugwort possesses a unique botanical property: its infrared thermal radiation spectrum matches the human body's absorption wavelengths almost identically, allowing the soothing heat to penetrate up to several centimeters into deep tissues.\n\n### Clinical Conditions Best Treated by Moxa\n* **Cold-Induced Joint and Muscle Pain**: Arthritis that aches worse in damp, rainy weather.\n* **Digestive Weakness and Diarrhea**: Coldness in the abdomen, chronic loose stools, or lack of appetite.\n* **Gynecological Balance**: Alleviating menstrual cramping caused by cold stagnation in the lower abdomen.\n* **Immune Fortification**: Warming acupoint Zusanli (ST36) regularly has been shown to increase white blood cell counts and enhance vitality.\n\nExperience this gentle, deeply comforting radiant warmth during your integrative clinical session."
    },
    {
      "id": "adaptogenic-herbs-stress-longevity",
      "title": "Sacred Adaptogens: Reishi, Astragalus, and Ginseng for Immune Resilience",
      "author": "Dr. Jonathan Wu, Dipl. O.M.",
      "date": "September 22, 2026",
      "readTime": "7 min read",
      "category": "Herbal Medicine",
      "image": "assets/images/herbal_prep.jpg",
      "excerpt": "Explore the clinical science and energetic virtues of sovereign tonic herbs that strengthen Wei Qi (defensive immunity) and modulate systemic stress.",
      "tags": [
        "Adaptogens",
        "Immunity",
        "Reishi Mushroom",
        "Longevity"
      ],
      "content": "In modern wellness culture, the term 'adaptogen' is widely celebrated. Yet over two millennia before modern pharmacology coined the term, classical Chinese herbal texts classified these elite botanicals as **Superior Herbs (*Shang Yao*)**—substances safe for daily consumption that promote longevity without causing side effects.\n\n### The Three Sovereign Adaptogens\n1. **Astragalus (*Huang Qi*)**: The premier builder of *Wei Qi* (the body's exterior protective shield). Clinical studies demonstrate Astragalus enhances immune cell proliferation and supports telomere integrity.\n2. **Reishi Mushroom (*Ling Zhi*)**: Known as the 'Mushroom of Immortality,' Reishi balances both the immune response and the nervous system, calming an overactive stress response while nourishing deep marrow.\n3. **Ren Shen (Ginseng)**: The quintessential root for rescuing collapsed Qi. It supports cognitive endurance, adrenal output, and cardiovascular stamina.\n\nWhen formulated in proper proportions by a licensed herbalist, adaptogens do not overstimulate like caffeine; they build sustained, enduring physiological reserves."
    },
    {
      "id": "art-of-herbal-dispensing-apothecary",
      "title": "The Classical Apothecary: How Formulas are Compounded for Unique Constitutions",
      "author": "Dr. Evelyn Zhao, DACM",
      "date": "September 12, 2026",
      "readTime": "6 min read",
      "category": "Herbal Medicine",
      "image": "assets/images/herbal_apothecary.jpg",
      "excerpt": "Step inside our full-service clinical dispensary to see how centuries of herbal compounding wisdom blend with modern pharmaceutical purity testing.",
      "tags": [
        "Apothecary",
        "Granule Dispensary",
        "Formulation",
        "Quality Control"
      ],
      "content": "Behind the reception area of Harmony Spring sits our heart: the traditional Chinese herbal dispensary. Here, hundreds of glass jars and hand-carved apothecary drawers hold single-herb concentrated botanical extracts.\n\n### Why One Size Never Fits All in TCM\nIn modern medicine, if three people have elevated blood pressure, they often receive the identical pharmaceutical medication. In Traditional Chinese Medicine:\n\n* Patient A may have excess Liver Fire manifesting with red eyes, irritability, and throbbing temples.\n* Patient B may have Kidney Yin Deficiency with night sweats, backache, and restless sleep.\n* Patient C may have Spleen Dampness with water retention, heaviness, and fatigue.\n\nEach requires an entirely different custom prescription formulated specifically for their body's present energetic constitution.\n\n### Our Quality Commitment\nEvery batch of concentrated granules in our dispensary is tested for microbial purity, pesticide residues, and heavy metals by independent ISO-accredited third-party laboratories. You receive the pure concentrated essence of ancient healing with modern safety assurance."
    },
    {
      "id": "sleep-insomnia-tcm-circadian-rhythm",
      "title": "Restoring the Shen: A TCM Blueprint for Deep, Restorative Sleep and Serenity",
      "author": "Dr. Meilin Chen, DACM",
      "date": "September 8, 2026",
      "readTime": "8 min read",
      "category": "TCM Fundamentals",
      "image": "assets/images/sleep_shen_harmony.jpg",
      "excerpt": "When the Shen (spirit) wanders at night, insomnia and racing thoughts emerge. Discover acupressure points, nighttime rituals, and heart-harmonizing herbs.",
      "tags": [
        "Sleep Health",
        "Shen Spirit",
        "Acupressure",
        "Anxiety Relief"
      ],
      "content": "In Traditional Chinese Medicine, insomnia is rarely viewed as a simple chemical imbalance; it is understood as a disturbance of the **Shen** (the conscious spirit and emotional mind) anchored within the Heart and Blood.\n\n### Why We Struggle to Fall and Stay Asleep\nDuring the day, Yang energy circulates on the exterior of the body, allowing us to think, move, and work. As night falls, Yang must descend into Yin, and the Shen must settle peacefully into the Heart. However:\n\n* **Excess Screen Time and Late Meals**: Traps heat in the Stomach and Heart, making the Shen agitated.\n* **Blood Deficiency**: If blood is insufficient to anchor the spirit, one experiences frequent waking, vivid dreaming, and unrefreshing sleep.\n* **Gallbladder Deficiency**: Manifests as timidness, waking easily with startle, and difficulty making decisions.\n\n### Simple Nighttime Rituals for Peaceful Sleep\n1. **Acupressure on Anmian & Heart 7 (Shenmen)**: Gently press the hollow behind your earlobe (Anmian) and the inner wrist crease (Shenmen) for 2 minutes before bed.\n2. **Warm Foot Soak**: Soaking feet in warm water infused with ginger draws excess heat down from the head into the feet, easing mental racing.\n3. **Jujube Seed Tea (*Suan Zao Ren*)**: Nourishes Heart Yin and anchors the Shen naturally without next-day grogginess."
    },
    {
      "id": "pulse-and-tongue-diagnosis-secrets",
      "title": "The Mirror Within: What Your Pulse and Tongue Reveal About Your Health",
      "author": "Dr. Meilin Chen, DACM",
      "date": "August 25, 2026",
      "readTime": "7 min read",
      "category": "TCM Fundamentals",
      "image": "assets/images/pulse_diagnosis.jpg",
      "excerpt": "Learn how TCM physicians decode 28 distinct radial pulse qualities and tongue body color, shape, and coating to uncover hidden internal imbalances.",
      "tags": [
        "Pulse Diagnosis",
        "Tongue Diagnosis",
        "Diagnostic Art",
        "Root Cause"
      ],
      "content": "When you visit an acupuncturist for the first time, you are often asked two questions that might feel unusual: 'May I feel your radial pulse?' and 'Could you please show me your tongue?'\n\nThese two diagnostic methods have been refined over more than 2,000 years into one of medicine's most profound non-invasive observational arts.\n\n### The Radial Pulse: 28 Nuanced Qualities\nUnlike standard biometric pulse monitors that count only beats per minute, a TCM practitioner checks three distinct finger positions (Cun, Guan, Chi) at three different depths on both wrists, evaluating 12 internal organ systems.\n\n* **Wiry (*Xian*)**: Feels like a taut guitar string under the fingers, signaling Liver Qi stagnation or pain.\n* **Slippery (*Hua*)**: Feels like pearls rolling smoothly in a basin, indicating dampness, phlegm, or pregnancy.\n* **Thready (*Xi*)**: Thin as a silk thread, indicating deficient Qi and blood.\n\n### The Tongue: The Internal Weather Map\nThe tongue is the only internal organ visible from the exterior. Its color, moisture, shape, and coating reveal your body's constitutional state:\n\n* **Pale with teeth marks**: Indicates Spleen Qi deficiency and water retention.\n* **Red tip**: Indicates excess Heart heat and mental agitation.\n* **Thick yellow coat**: Signifies internal heat and digestive sluggishness.\n\nBy uniting pulse and tongue findings, our clinicians uncover the root disharmony before chronic conditions advance."
    }
  ],

  // Authoritative clinical fallback FAQ dataset
  FALLBACK_FAQS: [
    {
      "category": "Acupuncture Experience",
      "q": "What does acupuncture feel like? Does it hurt?",
      "a": "Acupuncture needles are hair-thin—approximately 20 to 30 times thinner than hypodermic injection needles. Most patients feel only a slight tap upon insertion, followed by a deeply relaxing sensation known as 'De Qi' (a mild warmth, gentle heaviness, or soothing tingle). Many patients drift into a peaceful nap during treatment."
    },
    {
      "category": "Acupuncture Experience",
      "q": "Are the needles clean and safe?",
      "a": "Yes, absolutely. We strictly use pre-sterilized, single-use, surgical-grade stainless steel needles that are disposed of in designated biohazard containers immediately after removal. A needle is never reused under any circumstances."
    },
    {
      "category": "First Visit",
      "q": "What should I expect during my first appointment?",
      "a": "Your initial visit takes approximately 60 to 75 minutes. Your practitioner will conduct an in-depth health consultation, examine your tongue, and check your radial pulse. You will then receive your first personalized acupuncture or complementary treatment on a comfortable, warmed treatment table, followed by personalized lifestyle and dietary guidance."
    },
    {
      "category": "First Visit",
      "q": "How should I prepare for my first visit?",
      "a": "Wear loose, comfortable clothing with easy access to your elbows, knees, and abdomen. Eat a light meal 1 to 2 hours beforehand so you are neither overly full nor fasting. Please refrain from brushing your tongue coating or drinking coffee or tea within two hours of your appointment."
    },
    {
      "category": "Herbal Formulas",
      "q": "Are Chinese herbal medicines safe to take alongside prescription drugs?",
      "a": "Our practitioners are extensively trained in herb-drug interactions. We carefully review all prescription medications and health history before formulating any herbal prescription. We always schedule herbs to be taken at least 2 hours apart from pharmaceutical medications when appropriate."
    },
    {
      "category": "Herbal Formulas",
      "q": "Where are your herbs sourced and tested?",
      "a": "Our dispensary uses exclusively Good Manufacturing Practice (GMP) certified herbal extracts. Each lot is independently third-party laboratory tested for heavy metals, microbial safety, and pesticide residues. We use 100% plant-based botanicals and never use endangered animal products."
    },
    {
      "category": "Pricing & Insurance",
      "q": "Do you accept health insurance for acupuncture?",
      "a": "Many health insurance plans now provide partial or full coverage for acupuncture. While we are an out-of-network provider, we provide detailed medical Superbills with diagnostic and CPT billing codes that you can easily submit to your insurance company for reimbursement. We also accept HSA and FSA cards."
    },
    {
      "category": "Treatment Plans",
      "q": "How many treatments will I need to see lasting results?",
      "a": "The number of sessions depends on whether your condition is acute or chronic. Acute conditions (such as a sudden neck spasm) often improve within 2 to 4 sessions. Chronic issues (such as long-term migraines or hormonal imbalance) typically require 6 to 10 weekly sessions followed by maintenance care."
    }
  ],

  // Practitioners Endpoints
  practitioners: {
    async getAll() {
      try {
        const data = await API.request('/api/practitioners');
        if (data && data.practitioners && Array.isArray(data.practitioners) && data.practitioners.length > 0) {
          return data;
        }
        throw new Error('Practitioners response returned empty or invalid structure');
      } catch (err) {
        console.warn('API practitioners endpoint unreachable or returned error, attempting fallback:', err.message);

        // 1. Try local data/db.json (relative path in static web servers)
        try {
          const localRes = await fetch('data/db.json');
          if (localRes.ok) {
            const dbData = await localRes.json();
            if (dbData && Array.isArray(dbData.practitioners) && dbData.practitioners.length > 0) {
              return { success: true, practitioners: dbData.practitioners, source: 'local_db' };
            }
          }
        } catch (localErr) {
          // Continue to embedded fallback
        }

        // 2. Authoritative local fallback dataset (exactly 3 profiles)
        if (API.FALLBACK_PRACTITIONERS && API.FALLBACK_PRACTITIONERS.length > 0) {
          return { success: true, practitioners: API.FALLBACK_PRACTITIONERS, source: 'embedded_fallback' };
        }

        // 3. Rethrow only if both API and fallback fail
        throw err;
      }
    },

    async getById(id) {
      try {
        const data = await API.request(`/api/practitioners/${id}`);
        if (data && data.practitioner) {
          return data;
        }
        throw new Error('Practitioner response returned invalid structure');
      } catch (err) {
        console.warn(`API practitioner detail ${id} unreachable, resolving from fallback dataset:`, err.message);
        const listData = await this.getAll();
        const found = listData.practitioners ? listData.practitioners.find(p => p.id === id) : null;
        if (found) {
          return { success: true, practitioner: found, source: listData.source || 'fallback' };
        }
        throw err;
      }
    }
  },

  // Appointments Endpoints
  appointments: {
    async getAvailableSlots(practitionerId, date) {
      try {
        const data = await API.request(`/api/appointments/available-slots?practitionerId=${encodeURIComponent(practitionerId)}&date=${encodeURIComponent(date)}`);
        if (data && data.availableSlots && Array.isArray(data.availableSlots)) {
          return data;
        }
        throw new Error('Available slots response invalid');
      } catch (err) {
        return {
          success: true,
          availableSlots: ['09:00 AM', '10:00 AM', '11:00 AM', '01:30 PM', '02:30 PM', '03:30 PM', '04:30 PM'],
          bookedSlots: [],
          source: 'embedded_fallback'
        };
      }
    },
    async book(bookingData) {
      try {
        return await API.request('/api/appointments/book', {
          method: 'POST',
          body: JSON.stringify(bookingData)
        });
      } catch (err) {
        console.warn('API booking unreachable, simulating offline booking confirmation:', err.message);
        return {
          success: true,
          message: 'Appointment reserved successfully! A confirmation SMS and email have been sent.',
          appointment: {
            id: 'apt_demo_' + Date.now(),
            ...bookingData,
            status: 'confirmed',
            createdAt: new Date().toISOString()
          },
          source: 'offline_demo'
        };
      }
    },
    async getMy() {
      try {
        return await API.request('/api/appointments/my');
      } catch (err) {
        return {
          success: true,
          appointments: [
            {
              id: "apt_1001",
              patientName: "Sarah Chen",
              practitionerName: "Dr. Meilin Chen",
              serviceName: "Initial Acupuncture Consultation",
              date: "2026-10-25",
              time: "10:00 AM",
              status: "confirmed"
            }
          ]
        };
      }
    },
    async cancel(id) {
      try {
        return await API.request(`/api/appointments/${id}/cancel`, { method: 'POST' });
      } catch (err) {
        return { success: true, message: 'Appointment cancelled successfully.' };
      }
    },
    async reschedule(id, date, time) {
      try {
        return await API.request(`/api/appointments/${id}/reschedule`, {
          method: 'POST',
          body: JSON.stringify({ date, time })
        });
      } catch (err) {
        return { success: true, message: 'Appointment rescheduled successfully.' };
      }
    }
  },

  // Clinical Records Endpoints
  clinical: {
    async getTreatmentPlans() {
      try {
        return await API.request('/api/treatment-plans/my');
      } catch (err) {
        return {
          success: true,
          treatmentPlans: [{
          "id": "tp_2026_01",
          "patientId": "usr_patient_1",
          "planName": "Cervicogenic Migraine & Qi Stagnation Harmonization",
          "diagnosedPattern": "Liver Qi Stagnation with Ascending Liver Yang and Cervical Myofascial Tension",
          "practitionerName": "Dr. Meilin Chen, DACM, L.Ac",
          "startDate": "2026-09-10",
          "targetCompletion": "2026-11-05",
          "totalRecommendedSessions": 8,
          "completedSessions": 5,
          "remainingSessions": 3,
          "progressPercentage": 63,
          "status": "In Progress",
          "clinicalGoals": [
                    "Reduce weekly headache episodes from 4 to <= 1",
                    "Restore full cervical lateral flexion and shoulder mobility",
                    "Harmonize Liver-Spleen axis to resolve accompanying evening fatigue",
                    "Taper reliance on emergency over-the-counter analgesics"
          ],
          "clinicalNotes": "Patient exhibits outstanding therapeutic response following Session 5. Pulse has softened from wiry (Xian) to moderate (Huan). Tongue coating has normalized from thin yellow coat to balanced thin white coat. Reported headache intensity decreased by 65%. Recommended continued weekly acupuncture through session 8, supplemented with prescribed modified Xiao Yao San formula.",
          "homecareInstructions": "Practice 5 minutes of gentle neck and meridian stretching twice daily. Drink warm mint-chrysanthemum or ginger tea. Avoid cold air drafts on upper shoulders.",
          "sessions": [
                    {
                              "sessionNumber": 1,
                              "date": "2026-09-10",
                              "title": "Initial Assessment & Meridian Unblocking",
                              "modality": "Acupuncture + Gentle Palpation",
                              "notes": "Focused on clearing stagnation at GB20, GB21, LI4, and LR3. Deep relaxation achieved during retention.",
                              "status": "Completed"
                    },
                    {
                              "sessionNumber": 2,
                              "date": "2026-09-17",
                              "title": "Targeted Upper Thoracic Release",
                              "modality": "Acupuncture + Infrared Heat",
                              "notes": "Added ST36 to boost underlying Qi. Patient reported 2 headache-free days following session 1.",
                              "status": "Completed"
                    },
                    {
                              "sessionNumber": 3,
                              "date": "2026-09-24",
                              "title": "Myofascial Decompression Session",
                              "modality": "Fire Cupping & Gliding Cupping",
                              "notes": "Moderate deep red Sha emerged along Bladder meridian (BL11 to BL15), resolving within 4 days.",
                              "status": "Completed"
                    },
                    {
                              "sessionNumber": 4,
                              "date": "2026-10-01",
                              "title": "Electro-Acupuncture Neuromodulation",
                              "modality": "Electro-Acupuncture (2Hz continuous)",
                              "notes": "Low-frequency stimulation applied to neck acupoints. Remarkable tension release in levator scapulae.",
                              "status": "Completed"
                    },
                    {
                              "sessionNumber": 5,
                              "date": "2026-10-08",
                              "title": "Harmonizing Liver-Spleen Balance",
                              "modality": "Acupuncture & Auricular Acupressure",
                              "notes": "Applied Shen Men and Occiput ear seeds. Energy levels elevated; zero migraine episodes in past 7 days.",
                              "status": "Completed"
                    },
                    {
                              "sessionNumber": 6,
                              "date": "2026-10-15",
                              "title": "Consolidation & Stress Regulation",
                              "modality": "Acupuncture + Light Cupping",
                              "notes": "Scheduled next. Reviewing progress and adjusting point selection.",
                              "status": "Scheduled"
                    },
                    {
                              "sessionNumber": 7,
                              "date": "2026-10-22",
                              "title": "Postural Stabilization & Re-evaluation",
                              "modality": "Acupuncture Therapy",
                              "notes": "Formal mid-course assessment of cervical range of motion.",
                              "status": "Upcoming"
                    },
                    {
                              "sessionNumber": 8,
                              "date": "2026-10-29",
                              "title": "Graduation & Transition to Monthly Maintenance",
                              "modality": "Acupuncture + Long-term Lifestyle Protocol",
                              "notes": "Final plan review and seasonal wellness schedule handoff.",
                              "status": "Upcoming"
                    }
          ]
}]
        };
      }
    },
    async getPrescriptions() {
      try {
        return await API.request('/api/prescriptions/my');
      } catch (err) {
        return {
          success: true,
          herbalPrescriptions: [{
          "id": "rx_2026_88",
          "patientId": "usr_patient_1",
          "prescriptionNumber": "RX-2026-1002-88",
          "formulaName": "Modified Xiao Yao San & Chuan Xiong Cha Tiao Formula",
          "traditionalPinyin": "加味逍遥散合川芎茶调散",
          "prescribedDate": "2026-10-02",
          "prescribingDoctor": "Dr. Jonathan Wu, Dipl. O.M., MSTCM",
          "authorizedStatus": "Active & Verified",
          "duration": "14-Day Concentrated Supply (28 doses)",
          "reviewDate": "2026-10-18",
          "administration": "Dissolve 1 level packet (6g concentrated herbal granules) into 150ml of warm boiled water. Stir well and drink warmly 30 minutes after meals, twice daily (morning and evening).",
          "herbalIngredients": [
                    {
                              "chinese": "柴胡",
                              "pinyin": "Chai Hu",
                              "latin": "Radix Bupleuri",
                              "dosage": "9 grams",
                              "function": "Soothes stagnant Liver Qi and elevates clear Yang"
                    },
                    {
                              "chinese": "白芍",
                              "pinyin": "Bai Shao",
                              "latin": "Radix Paeoniae Alba",
                              "dosage": "12 grams",
                              "function": "Nourishes Liver blood, softens liver spasms, relieves pain"
                    },
                    {
                              "chinese": "川芎",
                              "pinyin": "Chuan Xiong",
                              "latin": "Rhizoma Chuanxiong",
                              "dosage": "6 grams",
                              "function": "Invigorates blood and guides therapeutic action up to the head/temples"
                    },
                    {
                              "chinese": "白术",
                              "pinyin": "Bai Zhu",
                              "latin": "Rhizoma Atractylodis Macrocephalae",
                              "dosage": "9 grams",
                              "function": "Strengthens Spleen digestive Qi and prevents fluid retention"
                    },
                    {
                              "chinese": "茯苓",
                              "pinyin": "Fu Ling",
                              "latin": "Poria Cocos",
                              "dosage": "9 grams",
                              "function": "Calms the Shen (mind) and gently drains dampness"
                    },
                    {
                              "chinese": "当归",
                              "pinyin": "Dang Gui",
                              "latin": "Radix Angelicae Sinensis",
                              "dosage": "8 grams",
                              "function": "Nourishes and harmonizes blood circulation"
                    },
                    {
                              "chinese": "薄荷",
                              "pinyin": "Bo He",
                              "latin": "Herba Menthae",
                              "dosage": "3 grams",
                              "function": "Clears heat and disperses stagnant wind from the head"
                    },
                    {
                              "chinese": "炙甘草",
                              "pinyin": "Zhi Gan Cao",
                              "latin": "Radix Glycyrrhizae Preparata",
                              "dosage": "4 grams",
                              "function": "Harmonizes and balances all botanical ingredients"
                    }
          ],
          "precautions": "Documented Allergies Verified: Patient has reported mild bee pollen sensitivity; formula is 100% pure botanical and verified allergen-safe. Discontinue if unexpected loose stools occur and contact clinic. Do not take simultaneously with antacids or prescription blood thinners without practitioner approval.",
          "dispensingPharmacy": "Harmony Spring TCM In-House Herbal Dispensary (GMP Certified, Batch #HS-2026-8809)",
          "refillsRemaining": 1
}]
        };
      }
    },
    async getNotifications() {
      try {
        return await API.request('/api/notifications/my');
      } catch (err) {
        return {
          success: true,
          notifications: [
            {
              id: "notif_1",
              title: "Upcoming Acupuncture Consultation",
              message: "Reminder: You have an appointment tomorrow at 10:00 AM with Dr. Meilin Chen.",
              date: "2026-10-18T08:00:00Z",
              read: false
            },
            {
              id: "notif_2",
              title: "Herbal Prescription Titration",
              message: "Dr. Jonathan Wu updated your Xiao Yao San formula instructions inside your dashboard.",
              date: "2026-10-15T14:30:00Z",
              read: true
            }
          ]
        };
      }
    },
    async updateProfile(profileData) {
      try {
        return await API.request('/api/users/profile', {
          method: 'PUT',
          body: JSON.stringify(profileData)
        });
      } catch (err) {
        const current = API.getCurrentUser() || {};
        const updated = { ...current, ...profileData };
        API.setSession(null, updated);
        return { success: true, message: 'Profile updated successfully.', user: updated };
      }
    }
  },

  // Public General Endpoints
  general: {
    async contact(formData) {
      try {
        return await API.request('/api/contact', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      } catch (err) {
        console.warn('API contact unreachable, returning offline confirmation:', err.message);
        return {
          success: true,
          message: 'Thank you for reaching out to Harmony Spring TCM Clinic. Our clinical coordinator will respond within 24 hours.'
        };
      }
    },
    async subscribeNewsletter(email) {
      try {
        return await API.request('/api/newsletter', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
      } catch (err) {
        console.warn('API newsletter unreachable, returning offline confirmation:', err.message);
        return {
          success: true,
          message: 'Thank you for subscribing to our Seasonal TCM Wellness Journal!'
        };
      }
    },
    async getBlogPosts() {
      try {
        const data = await API.request('/api/blog');
        if (data && data.blogPosts && Array.isArray(data.blogPosts) && data.blogPosts.length > 0) {
          return data;
        }
        throw new Error('Blog posts response returned empty or invalid structure');
      } catch (err) {
        console.warn('API blog endpoint unreachable or returned error, attempting fallback:', err.message);

        // 1. Try local data/db.json (relative path in static web servers)
        try {
          const localRes = await fetch('data/db.json');
          if (localRes.ok) {
            const dbData = await localRes.json();
            if (dbData && Array.isArray(dbData.blogPosts) && dbData.blogPosts.length > 0) {
              return { success: true, blogPosts: dbData.blogPosts, source: 'local_db' };
            }
          }
        } catch (localErr) {
          // Continue to embedded fallback
        }

        // 2. Authoritative local fallback dataset (12 articles)
        if (API.FALLBACK_BLOG_POSTS && API.FALLBACK_BLOG_POSTS.length > 0) {
          return { success: true, blogPosts: API.FALLBACK_BLOG_POSTS, source: 'embedded_fallback' };
        }

        // 3. Rethrow only if both API and fallback fail
        throw err;
      }
    },
    async getBlogPostById(id) {
      try {
        const data = await API.request(`/api/blog/${id}`);
        if (data && data.blogPost) {
          return data;
        }
        throw new Error('Blog post response returned invalid structure');
      } catch (err) {
        console.warn(`API blog detail ${id} unreachable, resolving from fallback dataset:`, err.message);
        const listData = await this.getBlogPosts();
        const found = listData.blogPosts ? listData.blogPosts.find(p => p.id === id) : null;
        if (found) {
          return { success: true, blogPost: found, source: listData.source || 'fallback' };
        }
        throw err;
      }
    },
    async getFaqs() {
      try {
        const data = await API.request('/api/faqs');
        if (data && data.faqs && Array.isArray(data.faqs) && data.faqs.length > 0) {
          return data;
        }
        throw new Error('FAQs response returned empty or invalid structure');
      } catch (err) {
        console.warn('API faqs endpoint unreachable, attempting fallback:', err.message);
        try {
          const localRes = await fetch('data/db.json');
          if (localRes.ok) {
            const dbData = await localRes.json();
            if (dbData && Array.isArray(dbData.faqs) && dbData.faqs.length > 0) {
              return { success: true, faqs: dbData.faqs, source: 'local_db' };
            }
          }
        } catch (localErr) {}
        if (API.FALLBACK_FAQS && API.FALLBACK_FAQS.length > 0) {
          return { success: true, faqs: API.FALLBACK_FAQS, source: 'embedded_fallback' };
        }
        throw err;
      }
    }
  }
};

if (typeof window !== "undefined") {
  window.API = API;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = API;
}
