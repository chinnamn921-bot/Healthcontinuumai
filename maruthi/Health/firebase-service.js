/**
 * HealthContinuum AI — Firebase Service Layer
 * Cloud Firestore, Firebase Storage & Firebase Authentication services.
 */

'use strict';

const FirebaseService = {
  // ── 1. AUTHENTICATION ────────────────────────────────────────────────────────
  async signIn(email, password) {
    const auth = window.FirebaseConfig.getAuth();
    if (!auth) throw new Error('Firebase Auth not initialized');
    return await auth.signInWithEmailAndPassword(email, password);
  },

  async signUp(email, password, displayName = '') {
    const auth = window.FirebaseConfig.getAuth();
    if (!auth) throw new Error('Firebase Auth not initialized');
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    if (displayName && userCredential.user) {
      await userCredential.user.updateProfile({ displayName });
    }
    return userCredential;
  },

  async signInAnonymously() {
    const auth = window.FirebaseConfig.getAuth();
    if (!auth) throw new Error('Firebase Auth not initialized');
    return await auth.signInAnonymously();
  },

  async signInWithGoogle() {
    const auth = window.FirebaseConfig.getAuth();
    if (!auth) throw new Error('Firebase Auth not initialized');
    const provider = new firebase.auth.GoogleAuthProvider();
    return await auth.signInWithPopup(provider);
  },

  async signOut() {
    const auth = window.FirebaseConfig.getAuth();
    if (auth) await auth.signOut();
  },

  getCurrentUser() {
    const auth = window.FirebaseConfig.getAuth();
    return auth ? auth.currentUser : null;
  },

  onAuthStateChanged(callback) {
    const auth = window.FirebaseConfig.getAuth();
    if (!auth) return () => {};
    return auth.onAuthStateChanged(callback);
  },

  // ── 2. FIRESTORE: PATIENT DATA ───────────────────────────────────────────────
  async getPatient(patientId = 'pat-ramesh-001') {
    const db = window.FirebaseConfig.getDb();
    if (!db) return null;
    const docSnap = await db.collection('patients').doc(patientId).get();
    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async updatePatient(patientId, data) {
    const db = window.FirebaseConfig.getDb();
    if (!db) throw new Error('Firestore not initialized');
    await db.collection('patients').doc(patientId).set(data, { merge: true });
    return { success: true };
  },

  // ── 3. FIRESTORE: VISITS ────────────────────────────────────────────────────
  async getVisits(patientId = 'pat-ramesh-001') {
    const db = window.FirebaseConfig.getDb();
    if (!db) return [];
    const querySnap = await db.collection('patients').doc(patientId).collection('visits')
      .orderBy('dateRaw', 'desc')
      .get();
    return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async createVisit(patientId, visitData) {
    const db = window.FirebaseConfig.getDb();
    if (!db) throw new Error('Firestore not initialized');
    const docRef = await db.collection('patients').doc(patientId).collection('visits').add({
      ...visitData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, ...visitData };
  },

  // ── 4. FIRESTORE: MEDICATIONS ───────────────────────────────────────────────
  async getMedications(patientId = 'pat-ramesh-001', status = null) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return [];
    let query = db.collection('patients').doc(patientId).collection('medications');
    if (status) query = query.where('status', '==', status);
    const snap = await query.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── 5. FIRESTORE: LABS ──────────────────────────────────────────────────────
  async getLabs(patientId = 'pat-ramesh-001') {
    const db = window.FirebaseConfig.getDb();
    if (!db) return [];
    const snap = await db.collection('patients').doc(patientId).collection('labs')
      .orderBy('date', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── 6. FIRESTORE & STORAGE: DOCUMENTS ───────────────────────────────────────
  async getDocuments(patientId = 'pat-ramesh-001', docType = null) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return [];
    let query = db.collection('patients').doc(patientId).collection('documents');
    if (docType) query = query.where('type', '==', docType);
    const snap = await query.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async uploadMedicalDocument(patientId, file, metadata = {}) {
    const db = window.FirebaseConfig.getDb();
    const storage = window.FirebaseConfig.getStorage();
    if (!db) throw new Error('Firestore not initialized');

    let fileUrl = null;
    let storagePath = null;

    // Upload to Firebase Storage if file is provided and Storage is available
    if (file && storage) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      storagePath = `patients/${patientId}/documents/${timestamp}_${safeName}`;
      const storageRef = storage.ref(storagePath);
      
      const uploadTask = await storageRef.put(file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          patientId,
          docType: metadata.type || 'OTHER'
        }
      });
      fileUrl = await uploadTask.ref.getDownloadURL();
    }

    // Save document metadata record to Firestore
    const docData = {
      name: metadata.name || (file ? file.name : 'Medical Document'),
      type: metadata.type || 'OTHER',
      hospitalName: metadata.hospitalName || 'City Care Hospital, Chennai',
      doctorName: metadata.doctorName || 'Dr. Priya Sharma',
      date: metadata.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      dateRaw: metadata.dateRaw || new Date().toISOString().split('T')[0],
      fileUrl: fileUrl,
      storagePath: storagePath,
      fileName: file ? file.name : (metadata.fileName || 'document.pdf'),
      fileSize: file ? file.size : 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('patients').doc(patientId).collection('documents').add(docData);
    return { id: docRef.id, ...docData };
  },

  // ── 7. FIRESTORE: DECISION MEMORY ───────────────────────────────────────────
  async getDecisionMemory(patientId = 'pat-ramesh-001') {
    const db = window.FirebaseConfig.getDb();
    if (!db) return [];
    const snap = await db.collection('patients').doc(patientId).collection('decisions')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // ── 8. FIRESTORE: DOCTOR ACCESS GRANTS ───────────────────────────────────────
  async createAccessGrant(patientId, grantData) {
    const db = window.FirebaseConfig.getDb();
    if (!db) throw new Error('Firestore not initialized');
    const docRef = await db.collection('access_grants').add({
      patientId,
      ...grantData,
      status: 'PENDING',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, ...grantData };
  },

  async verifyAccessCode(accessCode) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return null;
    const snap = await db.collection('access_grants')
      .where('code', '==', accessCode)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  // ── 9. SEED DEMO DATA TO FIRESTORE (Runs once if DB is empty) ──────────────
  async seedInitialDataIfEmpty(patientId = 'pat-ramesh-001', initialData = null) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      const patientRef = db.collection('patients').doc(patientId);
      const patientDoc = await patientRef.get();

      if (!patientDoc.exists && initialData) {
        console.info('[Firebase] Seeding initial patient records to Cloud Firestore...');
        const batch = db.batch();

        // 1. Patient profile
        batch.set(patientRef, {
          name: initialData.patient.name,
          firstName: initialData.patient.firstName,
          age: initialData.patient.age,
          bloodGroup: initialData.patient.bloodGroup,
          uhid: initialData.patient.uhid,
          phone: initialData.patient.phone,
          email: initialData.patient.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Visits
        if (Array.isArray(initialData.visits)) {
          initialData.visits.forEach(v => {
            const vRef = patientRef.collection('visits').doc(v.id);
            batch.set(vRef, v);
          });
        }

        // 3. Documents
        if (Array.isArray(initialData.documents)) {
          initialData.documents.forEach(doc => {
            const dRef = patientRef.collection('documents').doc(doc.id);
            batch.set(dRef, doc);
          });
        }

        await batch.commit();
        console.info('[Firebase] Initial clinical records successfully synced to Firestore!');
      }
    } catch (err) {
      console.warn('[Firebase] Seed check error:', err);
    }
  }
};

window.FirebaseService = FirebaseService;
