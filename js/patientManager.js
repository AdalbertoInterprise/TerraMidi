// PatientManager - Gestão local de pacientes e sessões para musicoterapia
// Responsável por persistir cadastros e registros de sessões no armazenamento local

(function(global) {
    'use strict';

    const STORAGE_KEY = 'terraMidi.patients';

    class PatientManager {
        constructor(storage) {
            this.storage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
            this.data = {
                patients: [],
                sessions: {}
            };

            this.load();
        }

        load() {
            if (!this.storage) {
                console.warn('PatientManager: armazenamento local indisponível. Dados serão mantidos em memória.');
                return;
            }

            const raw = this.storage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }

            try {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    this.data.patients = Array.isArray(parsed.patients) ? parsed.patients : [];
                    this.data.sessions = parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {};
                }
            } catch (error) {
                console.error('PatientManager: falha ao carregar dados persistidos', error);
            }
        }

        persist() {
            if (!this.storage) {
                return;
            }

            try {
                this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
            } catch (error) {
                console.error('PatientManager: falha ao salvar dados', error);
            }
        }

        generateId() {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            return `patient-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }

        clone(value) {
            return JSON.parse(JSON.stringify(value));
        }

        getAllPatients() {
            return this.clone(this.data.patients).sort((a, b) => {
                const nameA = (a.fullName || '').toLowerCase();
                const nameB = (b.fullName || '').toLowerCase();
                return nameA.localeCompare(nameB, 'pt-BR');
            });
        }

        getPatient(patientId) {
            return this.clone(this.data.patients.find(patient => patient.id === patientId));
        }

        savePatient(patientPayload) {
            if (!patientPayload) {
                throw new Error('Dados do paciente são obrigatórios');
            }

            const now = new Date().toISOString();
            let patient = this.clone(patientPayload);
            if (!patient.id) {
                patient.id = this.generateId();
                patient.createdAt = now;
                this.data.patients.push(patient);
            } else {
                const index = this.data.patients.findIndex(item => item.id === patient.id);
                if (index === -1) {
                    patient.createdAt = now;
                    this.data.patients.push(patient);
                } else {
                    patient.createdAt = this.data.patients[index].createdAt || now;
                    this.data.patients[index] = patient;
                }
            }

            patient.updatedAt = now;
            const stored = this.data.patients.find(item => item.id === patient.id);
            if (stored) {
                stored.updatedAt = now;
            }

            if (!this.data.sessions[patient.id]) {
                this.data.sessions[patient.id] = [];
            }

            this.persist();
            return this.clone(patient);
        }

        deletePatient(patientId) {
            if (!patientId) {
                return false;
            }

            const initialLength = this.data.patients.length;
            this.data.patients = this.data.patients.filter(patient => patient.id !== patientId);
            delete this.data.sessions[patientId];

            const removed = this.data.patients.length !== initialLength;
            if (removed) {
                this.persist();
            }
            return removed;
        }

        getSessions(patientId) {
            const sessions = this.data.sessions[patientId] || [];
            return this.clone(sessions).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        }

        saveSession(patientId, sessionPayload) {
            if (!patientId) {
                throw new Error('Paciente é obrigatório para registrar sessão');
            }
            if (!sessionPayload) {
                throw new Error('Dados da sessão são obrigatórios');
            }

            if (!this.data.sessions[patientId]) {
                this.data.sessions[patientId] = [];
            }

            const now = new Date().toISOString();
            const session = this.clone(sessionPayload);
            session.patientId = patientId;

            if (!session.id) {
                session.id = this.generateId();
                session.createdAt = now;
                this.data.sessions[patientId].push(session);
            } else {
                const index = this.data.sessions[patientId].findIndex(item => item.id === session.id);
                if (index === -1) {
                    session.createdAt = now;
                    this.data.sessions[patientId].push(session);
                } else {
                    session.createdAt = this.data.sessions[patientId][index].createdAt || now;
                    this.data.sessions[patientId][index] = session;
                }
            }

            session.updatedAt = now;
            const stored = this.data.sessions[patientId].find(item => item.id === session.id);
            if (stored) {
                stored.updatedAt = now;
            }

            this.persist();
            return this.clone(session);
        }

        deleteSession(patientId, sessionId) {
            if (!patientId || !sessionId || !this.data.sessions[patientId]) {
                return false;
            }

            const originalLength = this.data.sessions[patientId].length;
            this.data.sessions[patientId] = this.data.sessions[patientId].filter(session => session.id !== sessionId);

            const removed = this.data.sessions[patientId].length !== originalLength;
            if (removed) {
                this.persist();
            }
            return removed;
        }

        exportData() {
            return this.clone(this.data);
        }

        importData(importPayload, { merge = true } = {}) {
            if (!importPayload || typeof importPayload !== 'object') {
                throw new Error('Formato de importação inválido');
            }

            const incomingPatients = Array.isArray(importPayload.patients) ? importPayload.patients : [];
            const incomingSessions = importPayload.sessions && typeof importPayload.sessions === 'object' ? importPayload.sessions : {};

            if (!merge) {
                this.data.patients = [];
                this.data.sessions = {};
            }

            const existingPatientsById = new Map(this.data.patients.map(patient => [patient.id, patient]));

            incomingPatients.forEach(patient => {
                if (!patient || !patient.id) {
                    return;
                }
                existingPatientsById.set(patient.id, patient);
            });

            this.data.patients = Array.from(existingPatientsById.values());

            Object.entries(incomingSessions).forEach(([patientId, sessions]) => {
                if (!Array.isArray(sessions)) {
                    return;
                }
                if (!this.data.sessions[patientId] || !merge) {
                    this.data.sessions[patientId] = [];
                }

                const sessionMap = new Map((this.data.sessions[patientId] || []).map(session => [session.id, session]));
                sessions.forEach(session => {
                    if (!session || !session.id) {
                        return;
                    }
                    sessionMap.set(session.id, session);
                });

                this.data.sessions[patientId] = Array.from(sessionMap.values());
            });

            this.persist();
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PatientManager;
    }

    if (typeof window !== 'undefined') {
        global.patientManager = new PatientManager();
    }

})(typeof window !== 'undefined' ? window : globalThis);
