
'use client';

import { getDb } from './firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    updateDoc,
    writeBatch,
    runTransaction,
    query,
    where,
    collectionGroup
} from 'firebase/firestore';
import type { Product, Sale, ExchangeRate, CostTitle, Customer, Expense, RecurringExpense, Employee, Attachment, Payment, AppSettings, UserProfile } from '@/lib/types';
import type { DataProvider } from './dataprovider';
import { calculateTotalCostInToman } from './utils';
import { addMonths, addYears, isBefore, startOfDay, isEqual, endOfMonth } from 'date-fns';

const ROOT_COLLECTION = 'users';

// This function now returns a DataProvider instance for a specific user.
export const FirestoreDataProvider = (userId: string, isSuperAdmin: boolean): DataProvider => {
  const getCollectionPath = (collectionName: string, customUserId?: string) => `${ROOT_COLLECTION}/${customUserId || userId}/${collectionName}`;

  const PRODUCTS_COLLECTION = getCollectionPath('products');
  const SALES_COLLECTION = getCollectionPath('sales');
  const SETTINGS_COLLECTION = getCollectionPath('settings');
  const COST_TITLES_COLLECTION = getCollectionPath('costTitles');
  const CUSTOMERS_COLLECTION = getCollectionPath('customers');
  const EXPENSES_COLLECTION = getCollectionPath('expenses');
  const RECURRING_EXPENSES_COLLECTION = getCollectionPath('recurringExpenses');
  const EMPLOYEES_COLLECTION = getCollectionPath('employees');
  const ATTACHMENTS_COLLECTION = getCollectionPath('attachments');
  const PAYMENTS_COLLECTION = getCollectionPath('payments');

  return {
    // Product Operations
    addProduct: async (product) => {
      const db = getDb();
      const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
      await setDoc(docRef, product);
    },
    getAllProducts: async () => {
      const db = getDb();
      const q = collection(db, PRODUCTS_COLLECTION);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Product);
    },
    getProductById: async (id) => {
      const db = getDb();
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as Product) : undefined;
    },
    updateProduct: async (originalId, product) => {
       const db = getDb();
       if (originalId !== product.id) {
          await deleteDoc(doc(db, PRODUCTS_COLLECTION, originalId));
       }
       const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
       await setDoc(docRef, product);
    },
    deleteProduct: async (id) => {
      const db = getDb();
      const docRef = doc(db, PRODUCTS_COLLECTION, id);
      await deleteDoc(docRef);
    },

    // Sale Operations
    addSale: async (saleData, newCustomerName) => {
      const db = getDb();
      return runTransaction(db, async (transaction) => {
          const saleId = Date.now().toString();
          let customerId = saleData.customerId;
          let customerName = saleData.customerName;

          if (newCustomerName && !customerId) {
              const newCustomerId = Date.now().toString();
              const newCustomer: Customer = {
                  id: newCustomerId,
                  name: newCustomerName,
                  phone: '',
                  address: ''
              };
              transaction.set(doc(db, CUSTOMERS_COLLECTION, newCustomerId), newCustomer);
              customerId = newCustomerId;
              customerName = newCustomerName;
          }
          
          const rates = await FirestoreDataProvider(userId, isSuperAdmin).getExchangeRates();

          const saleItemsWithCost = await Promise.all(saleData.items.map(async (item) => {
              const productDoc = await transaction.get(doc(db, PRODUCTS_COLLECTION, item.productId));
              const product = productDoc.data() as Product;
              const totalCost = product ? calculateTotalCostInToman(product.costs, rates) * item.quantity : 0;
              if(product) {
                  transaction.update(doc(db, PRODUCTS_COLLECTION, item.productId), { quantity: product.quantity - item.quantity });
              }
              return { ...item, totalCost };
          }));

          const finalSale: Sale = {
              ...saleData,
              id: Number(saleId),
              items: saleItemsWithCost,
              customerId,
              customerName
          };

          transaction.set(doc(db, SALES_COLLECTION, saleId.toString()), finalSale);
      });
    },
    getAllSales: async () => {
      const db = getDb();
      const q = collection(db, SALES_COLLECTION);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Sale).sort((a,b) => b.id - a.id);
    },

    // Settings Operations
    getAppSettings: async () => {
        const db = getDb();
        const docRef = doc(db, SETTINGS_COLLECTION, 'appSettings');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as AppSettings) : { shopName: 'حسابدار آنلاین آموزا' };
    },
    saveAppSettings: async (settings) => {
        const db = getDb();
        await setDoc(doc(db, SETTINGS_COLLECTION, 'appSettings'), settings);
    },
    getExchangeRates: async () => {
      const db = getDb();
      const docRef = doc(db, SETTINGS_COLLECTION, 'exchangeRates');
      const docSnap = await getDoc(docRef);
      if(docSnap.exists()){
        return docSnap.data().value as ExchangeRate[];
      }
      return [
          { currency: 'USD', rate: 50000 },
          { currency: 'AED', rate: 13600 },
          { currency: 'CNY', rate: 7000 },
      ];
    },
    saveExchangeRates: async (rates) => {
      const db = getDb();
      await setDoc(doc(db, SETTINGS_COLLECTION, 'exchangeRates'), { value: rates });
    },
    getCostTitles: async () => {
      const db = getDb();
      const q = collection(db, COST_TITLES_COLLECTION);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as CostTitle);
    },
    addCostTitle: async (costTitle) => {
      const db = getDb();
      await setDoc(doc(db, COST_TITLES_COLLECTION, costTitle.id), costTitle);
    },
    deleteCostTitle: async (id) => {
      const db = getDb();
      await deleteDoc(doc(db, COST_TITLES_COLLECTION, id));
    },
    
    // Customer Operations
    addCustomer: async (customerData) => {
      const db = getDb();
      const id = Date.now().toString();
      const customer = { ...customerData, id };
      await setDoc(doc(db, CUSTOMERS_COLLECTION, id), customer);
      return id;
    },
    getAllCustomers: async () => {
      const db = getDb();
      const q = collection(db, CUSTOMERS_COLLECTION);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Customer);
    },
    getCustomerById: async (id) => {
      const db = getDb();
      const docRef = doc(db, CUSTOMERS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as Customer) : undefined;
    },
    updateCustomer: async (customer) => {
      const db = getDb();
      await setDoc(doc(db, CUSTOMERS_COLLECTION, customer.id), customer);
    },
    deleteCustomer: async (id) => {
      const db = getDb();
      await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id));
    },
    
    // Expense Operations
    addExpense: async (expense, attachments) => {
      const db = getDb();
      const batch = writeBatch(db);
      const expenseId = Date.now().toString();
      
      const attachmentIds = attachments.map((att) => {
          const attachmentId = Date.now().toString() + Math.random();
          const newAttachment: Attachment = { ...att, id: attachmentId, sourceId: expenseId, sourceType: 'expense' };
          batch.set(doc(db, ATTACHMENTS_COLLECTION, attachmentId), newAttachment);
          return attachmentId;
      });

      const newExpense: Expense = { ...expense, id: expenseId, attachmentIds };
      batch.set(doc(db, EXPENSES_COLLECTION, expenseId), newExpense);
      await batch.commit();
    },
    updateExpense: async (expense, newAttachments, deletedAttachmentIds) => {
      const db = getDb();
      const batch = writeBatch(db);

      deletedAttachmentIds.forEach(id => {
          batch.delete(doc(db, ATTACHMENTS_COLLECTION, id));
      });

      const newAttachmentIds = newAttachments.map((att) => {
          const attachmentId = Date.now().toString() + Math.random();
          const newAttachment: Attachment = { ...att, id: attachmentId, sourceId: expense.id, sourceType: 'expense' };
          batch.set(doc(db, ATTACHMENTS_COLLECTION, attachmentId), newAttachment);
          return attachmentId;
      });
      
      const finalAttachmentIds = (expense.attachmentIds || [])
        .filter(id => !deletedAttachmentIds.includes(id))
        .concat(newAttachmentIds);

      const updatedExpense: Expense = { ...expense, attachmentIds: finalAttachmentIds };
      batch.set(doc(db, EXPENSES_COLLECTION, expense.id), updatedExpense);

      await batch.commit();
    },
    getAllExpenses: async () => {
      const db = getDb();
      const q = collection(db, EXPENSES_COLLECTION);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Expense).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    deleteExpense: async (id) => {
       const db = getDb();
       const batch = writeBatch(db);
       const attachments = await FirestoreDataProvider(userId, isSuperAdmin).getAttachmentsBySourceId(id);
       attachments.forEach(att => batch.delete(doc(db, ATTACHMENTS_COLLECTION, att.id)));
       batch.delete(doc(db, EXPENSES_COLLECTION, id));
       await batch.commit();
    },
    
    // Recurring Expense Operations
    addRecurringExpense: async (expense) => {
      const db = getDb();
      await setDoc(doc(db, RECURRING_EXPENSES_COLLECTION, expense.id), expense);
    },
    getAllRecurringExpenses: async () => {
      const db = getDb();
      const q = collection(db, RECURRING_EXPENSES_COLLECTION);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as RecurringExpense);
    },
    deleteRecurringExpense: async (id) => {
      const db = getDb();
      await deleteDoc(doc(db, RECURRING_EXPENSES_COLLECTION, id));
    },
    applyRecurringExpenses: async () => {
      const db = getDb();
      const recurringExpenses = await FirestoreDataProvider(userId, isSuperAdmin).getAllRecurringExpenses();
      const today = startOfDay(new Date());
      let expensesAddedCount = 0;
      const batch = writeBatch(db);

      for (const re of recurringExpenses) {
          let lastApplied = re.lastAppliedDate ? startOfDay(new Date(re.lastAppliedDate)) : startOfDay(new Date(re.startDate));
          let nextDueDate: Date;
          
          while (true) {
               if (re.frequency === 'monthly') {
                  nextDueDate = addMonths(lastApplied, 1);
              } else {
                  nextDueDate = addYears(lastApplied, 1);
              }
              
              if (isBefore(nextDueDate, today) || isEqual(nextDueDate, today)) {
                  if(re.lastAppliedDate && startOfDay(new Date(re.lastAppliedDate)) >= nextDueDate) {
                       lastApplied = nextDueDate;
                       continue;
                  }
                  const expenseId = Date.now().toString() + Math.random();
                  const newExpense: Expense = {
                      id: expenseId,
                      title: re.title,
                      amount: re.amount,
                      date: nextDueDate.toISOString(),
                      attachmentIds: []
                  };
                  batch.set(doc(db, EXPENSES_COLLECTION, expenseId), newExpense);
                  expensesAddedCount++;
                  
                  batch.update(doc(db, RECURRING_EXPENSES_COLLECTION, re.id), { lastAppliedDate: nextDueDate.toISOString() });
                  lastApplied = nextDueDate;
              } else {
                  break;
              }
          }
      }
      if(expensesAddedCount > 0) {
          await batch.commit();
      }
      return expensesAddedCount;
    },

    // Employee Operations
    addEmployee: async (employeeData) => {
      const db = getDb();
      const batch = writeBatch(db);
      const employeeId = Date.now().toString();
      const recurringExpenseId = `salary-${employeeId}`;

      const salaryExpense: RecurringExpense = {
          id: recurringExpenseId,
          title: `حقوق ${employeeData.name}`,
          amount: employeeData.salary,
          frequency: 'monthly',
          startDate: endOfMonth(new Date()).toISOString(),
      };

      const newEmployee: Employee = {
          id: employeeId,
          ...employeeData,
          recurringExpenseId,
      };

      batch.set(doc(db, EMPLOYEES_COLLECTION, employeeId), newEmployee);
      batch.set(doc(db, RECURRING_EXPENSES_COLLECTION, recurringExpenseId), salaryExpense);
      await batch.commit();
    },
    getAllEmployees: async () => {
      const db = getDb();
      const q = collection(db, EMPLOYEES_COLLECTION);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Employee);
    },
    deleteEmployee: async (id) => {
      const db = getDb();
      const batch = writeBatch(db);
      const employeeDoc = await getDoc(doc(db, EMPLOYEES_COLLECTION, id));
      const employee = employeeDoc.data() as Employee;
      if (employee && employee.recurringExpenseId) {
          batch.delete(doc(db, RECURRING_EXPENSES_COLLECTION, employee.recurringExpenseId));
      }
      batch.delete(doc(db, EMPLOYEES_COLLECTION, id));
      await batch.commit();
    },
    updateEmployee: async (id, data) => {
      const db = getDb();
      await updateDoc(doc(db, EMPLOYEES_COLLECTION, id), data as Record<string, unknown>);
    },
    activateEmployee: async (id) => {
      const db = getDb();
      await updateDoc(doc(db, EMPLOYEES_COLLECTION, id), { isActive: true });
    },
    deactivateEmployee: async (id) => {
      const db = getDb();
      await updateDoc(doc(db, EMPLOYEES_COLLECTION, id), { isActive: false });
    },

    // Attachment Operations
    getAttachmentsBySourceId: async (sourceId) => {
      const db = getDb();
      const q = query(collection(db, ATTACHMENTS_COLLECTION), where("sourceId", "==", sourceId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Attachment);
    },
    uploadFile: async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    },
    
    // Payment Operations
    addPayment: async (paymentData, attachments) => {
      const db = getDb();
      const batch = writeBatch(db);
      const paymentId = Date.now().toString() + Math.random();
      
      const attachmentIds = await Promise.all(attachments.map(async (att) => {
          const attachmentId = Date.now().toString() + Math.random();
          const newAttachment: Attachment = { ...att, id: attachmentId, sourceId: paymentId, sourceType: 'payment' };
          batch.set(doc(db, ATTACHMENTS_COLLECTION, attachmentId), newAttachment);
          return attachmentId;
      }));

      const newPayment: Payment = {
          ...paymentData,
          id: paymentId,
          attachmentIds: attachmentIds,
      };
      batch.set(doc(db, PAYMENTS_COLLECTION, paymentId), newPayment);
      await batch.commit();
      return paymentId;
    },
    getPaymentsByIds: async (ids) => {
      const db = getDb();
      const validIds = ids?.filter(id => !!id) || [];
      if (validIds.length === 0) return [];
      
      const paymentPromises = validIds.map(id => getDoc(doc(db, PAYMENTS_COLLECTION, id)));
      const paymentDocs = await Promise.all(paymentPromises);
      return paymentDocs.filter(doc => doc.exists()).map(doc => doc.data() as Payment);
    },
    getAllPayments: async () => {
      const db = getDb();
      const querySnapshot = await getDocs(collection(db, PAYMENTS_COLLECTION));
      return querySnapshot.docs
        .map(doc => doc.data() as Payment)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    updatePayment: async (payment, attachments) => {
      const db = getDb();
      const batch = writeBatch(db);
      const currentAttachments = await FirestoreDataProvider(userId, isSuperAdmin).getAttachmentsBySourceId(payment.id);
      const incomingExistingIds = attachments.filter(att => att.id && !att.id.startsWith('new-')).map(att => att.id);

      currentAttachments
        .filter(att => !incomingExistingIds.includes(att.id))
        .forEach(att => batch.delete(doc(db, ATTACHMENTS_COLLECTION, att.id)));

      const attachmentIds = attachments.map(att => {
        const attachmentId = att.id && !att.id.startsWith('new-')
          ? att.id
          : Date.now().toString() + Math.random();
        batch.set(doc(db, ATTACHMENTS_COLLECTION, attachmentId), {
          ...att,
          id: attachmentId,
          sourceId: payment.id,
          sourceType: 'payment',
        });
        return attachmentId;
      });

      batch.set(doc(db, PAYMENTS_COLLECTION, payment.id), { ...payment, attachmentIds });
      await batch.commit();
    },
    deletePayment: async (id) => {
      const db = getDb();
      const batch = writeBatch(db);
      const attachments = await FirestoreDataProvider(userId, isSuperAdmin).getAttachmentsBySourceId(id);
      attachments.forEach(att => batch.delete(doc(db, ATTACHMENTS_COLLECTION, att.id)));
      batch.delete(doc(db, PAYMENTS_COLLECTION, id));
      await batch.commit();
    },

    // User Profile Operations
    getUserProfile: async (profileId: string) => {
        const db = getDb();
        const docRef = doc(db, ROOT_COLLECTION, profileId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
    },
    saveUserProfile: async (profile) => {
        const db = getDb();
        await setDoc(doc(db, ROOT_COLLECTION, profile.id), profile, { merge: true });
    },
    getAllUsers: async () => {
        if (!isSuperAdmin) {
            console.error("Access Denied: Only superadmins can get all users.");
            return [];
        }
        const db = getDb();
        const usersSnapshot = await getDocs(collection(db, ROOT_COLLECTION));
        const userProfiles: UserProfile[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const userProfile = userDoc.data() as UserProfile;
             const settingsDoc = await getDoc(doc(db, getCollectionPath('settings', userDoc.id), 'appSettings'));
             const shopName = settingsDoc.exists() ? (settingsDoc.data() as AppSettings).shopName : userProfile.displayName || 'بدون نام';

            userProfiles.push({
                ...userProfile,
                displayName: shopName,
            });
        }
        return userProfiles;
    },

    getLandingContent: async () => ({
        posts: [],
        settings: { sectionTitle: 'نمونه پروژه‌ها', contacts: [] },
    }),
    getLandingContentAdmin: async () => ({
        posts: [],
        settings: { sectionTitle: 'نمونه پروژه‌ها', contacts: [] },
    }),
    createLandingPost: async () => {
        throw new Error('Landing CMS is only available in online mode');
    },
    updateLandingPost: async () => {
        throw new Error('Landing CMS is only available in online mode');
    },
    deleteLandingPost: async () => {
        throw new Error('Landing CMS is only available in online mode');
    },
    updateLandingSettings: async () => {
        throw new Error('Landing CMS is only available in online mode');
    },
  };
};
