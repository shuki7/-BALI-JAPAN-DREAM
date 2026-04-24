import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Student,
  Payment,
  Partner,
  Scouter,
  CommissionPayment,
  Organization,
  StudentDocument,
  AppUser,
  BankAccount,
  StaffMember,
  StudentLog,
} from './types';

// Firestoreのタイムスタンプ/数値をDateに変換
function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date() : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function toDateOpt(val: unknown): Date | undefined {
  if (!val) return undefined;
  return toDate(val);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertStudent(id: string, data: any): Student {
  return {
    ...data,
    id,
    enrollmentDate: toDate(data.enrollmentDate),
    dateOfBirth: toDate(data.dateOfBirth),
    jlptPassDate: toDateOpt(data.jlptPassDate),
    jftPassDate: toDateOpt(data.jftPassDate),
    sswPassDate: toDateOpt(data.sswPassDate),
    parentDateOfBirth: toDateOpt(data.parentDateOfBirth),
    dormCheckInDate: toDateOpt(data.dormCheckInDate),
    dormCheckOutDate: toDateOpt(data.dormCheckOutDate),
    departureDate: toDateOpt(data.departureDate),
    coeIssueDate: toDateOpt(data.coeIssueDate),
    coeCancellationDate: toDateOpt(data.coeCancellationDate),
    jftPlannedDate: toDateOpt(data.jftPlannedDate),
    jftPassedDate: toDateOpt(data.jftPassedDate),
    sswPlannedDate: toDateOpt(data.sswPlannedDate),
    sswPassedDate: toDateOpt(data.sswPassedDate),
    interviews: data.interviews?.map((i: any) => ({
      ...i,
      date: toDate(i.date),
    })),
    yellowCards: data.yellowCards?.map((c: any) => ({
      ...c,
      date: toDate(c.date),
    })),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Student;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertPayment(id: string, data: any): Payment {
  return {
    ...data,
    id,
    jmStage1PaidDate: toDateOpt(data.jmStage1PaidDate),
    jmStage2PaidDate: toDateOpt(data.jmStage2PaidDate),
    jmStage3PaidDate: toDateOpt(data.jmStage3PaidDate),
    installments: data.installments?.map((inst: any) => ({
      ...inst,
      dueDate: toDate(inst.dueDate),
      paidDate: toDateOpt(inst.paidDate),
    })),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Payment;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertPartner(id: string, data: any): Partner {
  return {
    ...data,
    id,
    contractStartDate: toDateOpt(data.contractStartDate),
    contractEndDate: toDateOpt(data.contractEndDate),
    createdAt: toDate(data.createdAt),
  } as Partner;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertScouter(id: string, data: any): Scouter {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
  } as Scouter;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertCommissionPayment(id: string, data: any): CommissionPayment {
  return {
    ...data,
    id,
    paymentDate: toDateOpt(data.paymentDate),
    createdAt: toDate(data.createdAt),
  } as CommissionPayment;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertOrganization(id: string, data: any): Organization {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
  } as Organization;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertStudentDocument(id: string, data: any): StudentDocument {
  return {
    ...data,
    id,
    uploadDate: toDate(data.uploadDate),
    heldDate: toDateOpt(data.heldDate),
    returnedDate: toDateOpt(data.returnedDate),
  } as StudentDocument;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertStaffMember(id: string, data: any): StaffMember {
  return {
    ...data,
    id,
    contractDate: toDateOpt(data.contractDate),
    joinedDate: toDateOpt(data.joinedDate),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as StaffMember;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertStudentLog(id: string, data: any): StudentLog {
  return {
    ...data,
    id,
    date: toDate(data.date),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as StudentLog;
}

// =================== Students ===================

export async function getStudents(): Promise<Student[]> {
  const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertStudent(d.id, d.data()));
}

export async function getStudent(id: string): Promise<Student> {
  const snap = await getDoc(doc(db, 'students', id));
  if (!snap.exists()) throw new Error('Student not found');
  return convertStudent(snap.id, snap.data());
}

export async function addStudent(data: Omit<Student, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'students'), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<void> {
  await updateDoc(doc(db, 'students', id), { ...data, updatedAt: new Date() });
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'students', id));
}

// =================== Payments ===================

export async function getPayments(studentId?: string): Promise<Payment[]> {
  let q;
  if (studentId) {
    q = query(
      collection(db, 'payments'),
      where('studentId', '==', studentId)
    );
  } else {
    q = query(collection(db, 'payments'));
  }
  const snap = await getDocs(q);
  const payments = snap.docs.map((d) => convertPayment(d.id, d.data()));
  // Sort in frontend to avoid needing composite indexes
  return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function addPayment(data: Omit<Payment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'payments'), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  await updateDoc(doc(db, 'payments', id), { ...data, updatedAt: new Date() });
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'payments', id));
}

// =================== Partners ===================

export async function getPartners(): Promise<Partner[]> {
  const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertPartner(d.id, d.data()));
}

export async function addPartner(data: Omit<Partner, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'partners'), {
    ...data,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function updatePartner(id: string, data: Partial<Partner>): Promise<void> {
  await updateDoc(doc(db, 'partners', id), data);
}

export async function deletePartner(id: string): Promise<void> {
  await deleteDoc(doc(db, 'partners', id));
}

// =================== Scouters ===================

export async function getScouters(): Promise<Scouter[]> {
  const q = query(collection(db, 'scouters'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertScouter(d.id, d.data()));
}

export async function addScouter(data: Omit<Scouter, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'scouters'), {
    ...data,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function updateScouter(id: string, data: Partial<Scouter>): Promise<void> {
  await updateDoc(doc(db, 'scouters', id), data);
}

export async function deleteScouter(id: string): Promise<void> {
  await deleteDoc(doc(db, 'scouters', id));
}

// =================== Commission Payments ===================

export async function getCommissionPayments(): Promise<CommissionPayment[]> {
  const q = query(collection(db, 'commissionPayments'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertCommissionPayment(d.id, d.data()));
}

export async function addCommissionPayment(data: Omit<CommissionPayment, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'commissionPayments'), {
    ...data,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function updateCommissionPayment(id: string, data: Partial<CommissionPayment>): Promise<void> {
  await updateDoc(doc(db, 'commissionPayments', id), data);
}

export async function deleteCommissionPayment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'commissionPayments', id));
}

// =================== Organizations ===================

export async function getOrganizations(): Promise<Organization[]> {
  const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertOrganization(d.id, d.data()));
}

export async function addOrganization(data: Omit<Organization, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'organizations'), {
    ...data,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function updateOrganization(id: string, data: Partial<Organization>): Promise<void> {
  await updateDoc(doc(db, 'organizations', id), data);
}

export async function deleteOrganization(id: string): Promise<void> {
  await deleteDoc(doc(db, 'organizations', id));
}

// =================== Student Documents ===================

export async function getStudentDocuments(studentId: string): Promise<StudentDocument[]> {
  const q = query(
    collection(db, 'students', studentId, 'documents'),
    orderBy('uploadDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertStudentDocument(d.id, d.data()));
}

export async function addStudentDocument(
  studentId: string,
  data: Omit<StudentDocument, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'students', studentId, 'documents'), {
    ...data,
    uploadDate: new Date(),
  });
  return ref.id;
}

export async function updateStudentDocument(
  studentId: string,
  docId: string,
  data: Partial<StudentDocument>
): Promise<void> {
  await updateDoc(doc(db, 'students', studentId, 'documents', docId), data);
}

export async function deleteStudentDocument(studentId: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId, 'documents', docId));
}

// =================== Bank Accounts ===================

export async function getBankAccounts(studentId: string): Promise<BankAccount[]> {
  const q = query(
    collection(db, 'students', studentId, 'bankAccounts'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) } as BankAccount));
}

export async function addBankAccount(studentId: string, data: Omit<BankAccount, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'students', studentId, 'bankAccounts'), {
    ...data,
    createdAt: new Date(),
  });
  return ref.id;
}

export async function deleteBankAccount(studentId: string, accountId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId, 'bankAccounts', accountId));
}

// =================== Users ===================

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    createdAt: toDate(data.createdAt),
  } as AppUser;
}

export async function setUser(uid: string, data: AppUser): Promise<void> {
  await setDoc(doc(db, 'users', uid), data);
}

export async function getUsers(): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), createdAt: toDate(d.data().createdAt) } as AppUser));
}

// =================== Staff Members ===================

export async function getStaffMembers(): Promise<StaffMember[]> {
  const q = query(collection(db, 'staffMembers'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertStaffMember(d.id, d.data()));
}

export async function addStaffMember(data: Omit<StaffMember, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'staffMembers'), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

export async function updateStaffMember(id: string, data: Partial<StaffMember>): Promise<void> {
  await updateDoc(doc(db, 'staffMembers', id), { ...data, updatedAt: new Date() });
}

export async function deleteStaffMember(id: string): Promise<void> {
  await deleteDoc(doc(db, 'staffMembers', id));
}

// =================== Student Logs ===================

export async function getStudentLogs(studentId: string): Promise<StudentLog[]> {
  const q = query(
    collection(db, 'students', studentId, 'logs'),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertStudentLog(d.id, d.data()));
}

export async function addStudentLog(studentId: string, data: Omit<StudentLog, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'students', studentId, 'logs'), {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

export async function updateStudentLog(studentId: string, logId: string, data: Partial<StudentLog>): Promise<void> {
  await updateDoc(doc(db, 'students', studentId, 'logs', logId), { ...data, updatedAt: new Date() });
}

export async function deleteStudentLog(studentId: string, logId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId, 'logs', logId));
}

// =================== Announcements ===================

export async function getAnnouncement(): Promise<{ content: string; updatedAt: Date }> {
  const docRef = doc(db, 'settings', 'announcement');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      content: data.content || '',
      updatedAt: toDate(data.updatedAt),
    };
  }
  return { content: '', updatedAt: new Date() };
}

export async function updateAnnouncement(content: string): Promise<void> {
  await setDoc(doc(db, 'settings', 'announcement'), {
    content,
    updatedAt: new Date(),
  }, { merge: true });
}

// =================== Inventory ===================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertInventoryItem(id: string, data: any): any {
  return {
    ...data,
    id,
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getInventory(): Promise<any[]> {
  const q = query(collection(db, 'inventory'), orderBy('category', 'asc'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => convertInventoryItem(d.id, d.data()));
}

export async function addInventoryItem(data: any): Promise<string> {
  const ref = await addDoc(collection(db, 'inventory'), {
    ...data,
    updatedAt: new Date(),
  });
  return ref.id;
}

export async function updateInventoryItem(id: string, data: any): Promise<void> {
  await updateDoc(doc(db, 'inventory', id), {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'inventory', id));
}

