import type { Product, Sale, ExchangeRate, CostTitle, Customer, Expense, RecurringExpense, Employee, Payment, Attachment, AttachmentSource, AppSettings, UserProfile, LandingPost, LandingSettings, LandingContent } from '@/lib/types';

export interface DataProvider {
  // Product Operations
  addProduct: (product: Product) => Promise<void>;
  getAllProducts: () => Promise<Product[]>;
  getProductById: (id: string) => Promise<Product | undefined>;
  updateProduct: (originalId: string, product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Sale Operations
  addSale: (saleData: Omit<Sale, 'id'>, newCustomerName?: string) => Promise<void>;
  getAllSales: () => Promise<Sale[]>;

  // Settings Operations
  getExchangeRates: () => Promise<ExchangeRate[]>;
  saveExchangeRates: (rates: ExchangeRate[]) => Promise<void>;
  getCostTitles: () => Promise<CostTitle[]>;
  addCostTitle: (costTitle: CostTitle) => Promise<void>;
  deleteCostTitle: (id: string) => Promise<void>;
  getAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (settings: AppSettings) => Promise<void>;
  
  // Customer Operations
  addCustomer: (customer: Customer) => Promise<string>;
  getAllCustomers: () => Promise<Customer[]>;
  getCustomerById: (id: string) => Promise<Customer | undefined>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  
  // Expense Operations
  addExpense: (expense: Omit<Expense, 'id'|'attachmentIds'>, attachments: Omit<Attachment, 'id' | 'sourceId' | 'sourceType'>[]) => Promise<void>;
  updateExpense: (expense: Expense, newAttachments: Omit<Attachment, 'id'|'sourceId'|'sourceType'>[], deletedAttachmentIds: string[]) => Promise<void>;
  getAllExpenses: () => Promise<Expense[]>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Recurring Expense Operations
  addRecurringExpense: (expense: RecurringExpense) => Promise<void>;
  getAllRecurringExpenses: () => Promise<RecurringExpense[]>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  applyRecurringExpenses: () => Promise<number>;

  // Employee Operations
  addEmployee: (employeeData: Omit<Employee, 'id' | 'recurringExpenseId'> & { email?: string; password?: string }) => Promise<void>;
  updateEmployee: (id: string, data: Partial<Pick<Employee, 'name' | 'position' | 'salary' | 'isActive'>>) => Promise<void>;
  activateEmployee: (id: string) => Promise<void>;
  deactivateEmployee: (id: string) => Promise<void>;
  getAllEmployees: () => Promise<Employee[]>;
  deleteEmployee: (id: string) => Promise<void>;

  // Attachment Operations
  getAttachmentsBySourceId: (sourceId: string) => Promise<Attachment[]>;
  uploadFile: (file: File) => Promise<string>;
  
  // Payment Operations
  addPayment: (paymentData: Omit<Payment, 'id' | 'attachmentIds'>, attachments: Omit<Attachment, 'id'| 'sourceId' | 'sourceType'>[]) => Promise<string>;
  getPaymentsByIds: (ids: string[]) => Promise<Payment[]>;
  getAllPayments: () => Promise<Payment[]>;
  updatePayment: (
    payment: Payment,
    attachments: Omit<Attachment, 'sourceId' | 'sourceType'>[]
  ) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;

  // User Profile Operations
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
  getAllUsers: () => Promise<UserProfile[]>;
  impersonateUser: (userId: string) => Promise<{ token: string; user: UserProfile }>;
  stopImpersonation: () => Promise<{ token: string; user: UserProfile }>;
  getMyDesktopLicense: () => Promise<Record<string, unknown>>;
  regenerateDesktopLicense: () => Promise<Record<string, unknown>>;

  getLandingContent: () => Promise<LandingContent>;
  getLandingContentAdmin: () => Promise<LandingContent>;
  createLandingPost: (post: Omit<LandingPost, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LandingPost>;
  updateLandingPost: (id: string, post: Partial<Omit<LandingPost, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<LandingPost>;
  deleteLandingPost: (id: string) => Promise<void>;
  updateLandingSettings: (settings: LandingSettings) => Promise<LandingSettings>;
}
