import type { DataProvider } from './dataprovider';
import type {
    Product,
    Sale,
    ExchangeRate,
    CostTitle,
    Customer,
    Expense,
    RecurringExpense,
    Employee,
    Payment,
    Attachment,
    AppSettings,
    UserProfile,
    AttachmentSource
} from './types';

const parseArrayField = <T>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const normalizeProduct = (product: Product): Product => ({
    ...product,
    price: Number(product.price) || 0,
    quantity: Number(product.quantity) || 0,
    lowStockThreshold: Number(product.lowStockThreshold) || 0,
    profitMargin: Number(product.profitMargin) || 0,
    costs: parseArrayField(product.costs),
    media: parseArrayField(product.media),
});

const normalizeSale = (sale: Sale): Sale => ({
    ...sale,
    id: Number(sale.id),
    total: Number(sale.total) || 0,
    items: parseArrayField(sale.items) as Sale['items'],
    paymentIds: parseArrayField(sale.paymentIds) as string[],
});

const normalizePayment = (payment: Payment): Payment => ({
    ...payment,
    amount: Number(payment.amount) || 0,
    attachmentIds: parseArrayField(payment.attachmentIds) as string[],
});

const normalizeAttachment = (attachment: Attachment): Attachment => ({
    ...attachment,
    media: parseArrayField(attachment.media) as Attachment['media'],
});

export const APIDataProvider = (baseURL: string, getToken?: () => string | null): DataProvider => {
    const headers = () => {
        const token = getToken?.();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const handleResponse = async (response: Response) => {
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        if (response.status === 204) return;
        return response.json();
    };

    return {
        // Product Operations
        addProduct: async (product) => {
            const res = await fetch(`${baseURL}/api/products`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(product)
            });
            await handleResponse(res);
        },

        getAllProducts: async () => {
            const res = await fetch(`${baseURL}/api/products`, {
                headers: headers()
            });
            const products = await handleResponse(res);
            return Array.isArray(products) ? products.map(normalizeProduct) : [];
        },

        getProductById: async (id) => {
            const res = await fetch(`${baseURL}/api/products/${id}`, {
                headers: headers()
            });
            if (res.status === 404) return undefined;
            const product = await handleResponse(res);
            return product ? normalizeProduct(product) : undefined;
        },

        updateProduct: async (originalId, product) => {
            const res = await fetch(`${baseURL}/api/products/${originalId}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(product)
            });
            await handleResponse(res);
        },

        deleteProduct: async (id) => {
            const res = await fetch(`${baseURL}/api/products/${id}`, {
                method: 'DELETE',
                headers: headers()
            });
            await handleResponse(res);
        },

        // Sale Operations
        addSale: async (saleData, newCustomerName) => {
            const res = await fetch(`${baseURL}/api/sales`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ ...saleData, newCustomerName })
            });
            await handleResponse(res);
        },

        getAllSales: async () => {
            const res = await fetch(`${baseURL}/api/sales`, {
                headers: headers()
            });
            const sales = await handleResponse(res);
            return Array.isArray(sales) ? sales.map(normalizeSale) : [];
        },

        // Settings Operations
        getExchangeRates: async () => {
            const res = await fetch(`${baseURL}/api/settings/exchange-rates`, {
                headers: headers()
            });
            return handleResponse(res);
        },

        saveExchangeRates: async (rates) => {
            const res = await fetch(`${baseURL}/api/settings/exchange-rates`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(rates)
            });
            await handleResponse(res);
        },

        getCostTitles: async () => {
            const res = await fetch(`${baseURL}/api/settings/cost-titles`, {
                headers: headers()
            });
            return handleResponse(res);
        },

        addCostTitle: async (costTitle) => {
            const res = await fetch(`${baseURL}/api/settings/cost-titles`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(costTitle)
            });
            await handleResponse(res);
        },

        deleteCostTitle: async (id) => {
            const res = await fetch(`${baseURL}/api/settings/cost-titles/${id}`, {
                method: 'DELETE',
                headers: headers()
            });
            await handleResponse(res);
        },

        getAppSettings: async () => {
            const res = await fetch(`${baseURL}/api/settings/app`, {
                headers: headers()
            });
            return handleResponse(res);
        },

        saveAppSettings: async (settings) => {
            const res = await fetch(`${baseURL}/api/settings/app`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(settings)
            });
            await handleResponse(res);
        },

        // Customer Operations
        addCustomer: async (customer) => {
            const res = await fetch(`${baseURL}/api/customers`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(customer)
            });
            const result = await handleResponse(res);
            return result.id;
        },

        getAllCustomers: async () => {
            const res = await fetch(`${baseURL}/api/customers`, {
                headers: headers()
            });
            return handleResponse(res);
        },

        getCustomerById: async (id) => {
            const res = await fetch(`${baseURL}/api/customers/${id}`, {
                headers: headers()
            });
            if (res.status === 404) return undefined;
            return handleResponse(res);
        },

        updateCustomer: async (customer) => {
            const res = await fetch(`${baseURL}/api/customers/${customer.id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(customer)
            });
            await handleResponse(res);
        },

        deleteCustomer: async (id) => {
            const res = await fetch(`${baseURL}/api/customers/${id}`, {
                method: 'DELETE',
                headers: headers()
            });
            await handleResponse(res);
        },

        // Expense Operations
        addExpense: async (expense, attachments) => {
            const res = await fetch(`${baseURL}/api/expenses`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ ...expense, attachments })
            });
            await handleResponse(res);
        },

        updateExpense: async (expense, newAttachments, deletedAttachmentIds) => {
            const res = await fetch(`${baseURL}/api/expenses/${expense.id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({
                    ...expense,
                    newAttachments,
                    deletedAttachmentIds
                })
            });
            await handleResponse(res);
        },

        getAllExpenses: async () => {
            const res = await fetch(`${baseURL}/api/expenses`, {
                headers: headers()
            });
            return handleResponse(res);
        },

        deleteExpense: async (id) => {
            const res = await fetch(`${baseURL}/api/expenses/${id}`, {
                method: 'DELETE',
                headers: headers()
            });
            await handleResponse(res);
        },

        // Recurring Expense Operations
        addRecurringExpense: async (expense) => {
            const res = await fetch(`${baseURL}/api/recurring-expenses`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(expense)
            });
            await handleResponse(res);
        },

        getAllRecurringExpenses: async () => {
            const res = await fetch(`${baseURL}/api/recurring-expenses`, {
                headers: headers()
            });
            return handleResponse(res);
        },

        deleteRecurringExpense: async (id) => {
            const res = await fetch(`${baseURL}/api/recurring-expenses/${id}`, {
                method: 'DELETE',
                headers: headers()
            });
            await handleResponse(res);
        },

        applyRecurringExpenses: async () => {
            const res = await fetch(`${baseURL}/api/recurring-expenses/apply`, {
                method: 'POST',
                headers: headers()
            });
            const result = await handleResponse(res);
            return result.count;
        },

        // Employee Operations
        addEmployee: async (employeeData) => {
            const res = await fetch(`${baseURL}/api/employees`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify(employeeData)
            });
            await handleResponse(res);
        },

        updateEmployee: async (id, data) => {
            const res = await fetch(`${baseURL}/api/employees/${id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(data)
            });
            await handleResponse(res);
        },

        activateEmployee: async (id) => {
            const res = await fetch(`${baseURL}/api/employees/${id}/activate`, {
                method: 'PATCH',
                headers: headers()
            });
            await handleResponse(res);
        },

        deactivateEmployee: async (id) => {
            const res = await fetch(`${baseURL}/api/employees/${id}/deactivate`, {
                method: 'PATCH',
                headers: headers()
            });
            await handleResponse(res);
        },

        getAllEmployees: async () => {
            const res = await fetch(`${baseURL}/api/employees`, {
                headers: headers()
            });
            return handleResponse(res);
        },

        deleteEmployee: async (id) => {
            const res = await fetch(`${baseURL}/api/employees/${id}`, {
                method: 'DELETE',
                headers: headers()
            });
            await handleResponse(res);
        },

        // Attachment Operations
        getAttachmentsBySourceId: async (sourceId) => {
            const res = await fetch(`${baseURL}/api/attachments?sourceId=${sourceId}`, {
                headers: headers()
            });
            const attachments = await handleResponse(res);
            return Array.isArray(attachments) ? attachments.map(normalizeAttachment) : [];
        },

        uploadFile: async (file) => {
            const token = getToken?.();
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${baseURL}/api/upload`, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            const result = await handleResponse(res);
            return `${baseURL}${result.path}`;
        },

        // Payment Operations
        addPayment: async (paymentData, attachments) => {
            const res = await fetch(`${baseURL}/api/payments`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ ...paymentData, attachments })
            });
            const result = await handleResponse(res);
            return result.id;
        },

        getPaymentsByIds: async (ids) => {
            const parsedIds = parseArrayField(ids) as string[];
            if (parsedIds.length === 0) return [];
            const res = await fetch(`${baseURL}/api/payments?ids=${parsedIds.join(',')}`, {
                headers: headers()
            });
            const payments = await handleResponse(res);
            return Array.isArray(payments) ? payments.map(normalizePayment) : [];
        },

        getAllPayments: async () => {
            const res = await fetch(`${baseURL}/api/payments`, {
                headers: headers()
            });
            const payments = await handleResponse(res);
            return Array.isArray(payments) ? payments.map(normalizePayment) : [];
        },

        updatePayment: async (payment, attachments) => {
            const res = await fetch(`${baseURL}/api/payments/${payment.id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({
                    amount: payment.amount,
                    method: payment.method,
                    date: payment.date,
                    attachments,
                })
            });
            await handleResponse(res);
        },

        deletePayment: async (id) => {
            const res = await fetch(`${baseURL}/api/payments/${id}`, {
                method: 'DELETE',
                headers: headers()
            });
            await handleResponse(res);
        },

        // User Profile Operations
        getUserProfile: async (userId) => {
            const res = await fetch(`${baseURL}/api/users/profile`, {
                headers: headers()
            });
            if (res.status === 404) return null;
            return handleResponse(res);
        },

        saveUserProfile: async (profile) => {
            const res = await fetch(`${baseURL}/api/users/profile`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify(profile)
            });
            await handleResponse(res);
        },

        getAllUsers: async () => {
            const res = await fetch(`${baseURL}/api/users`, {
                headers: headers()
            });
            return handleResponse(res);
        }
    };
};
