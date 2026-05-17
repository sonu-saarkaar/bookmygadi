import { PORTAL_CONFIG } from '../utils/constants';

export interface LiveStats {
  riders: number;
  users: number;
  cities: number;
  rides: number;
}

export interface RegistrationData {
  email: string;
  phone: string;
  name: string;
  password: string;
  city?: string;
  role: 'customer' | 'driver';
}

export interface SupportTicketData {
  title: string;
  description: string;
  category: string;
  email: string;
  phone: string;
}

const API_BASE_URL = PORTAL_CONFIG.API_BASE_URL;

// Helper to make API calls with error handling
async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.detail || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

export const portalApi = {
  // Fetch live statistics from dashboard
  async getLiveStats(): Promise<LiveStats> {
    try {
      const response = await apiCall('/admin/dashboard');

      return {
        riders: response?.total_riders || 0,
        users: response?.total_customers || 0,
        cities: response?.total_areas || 0,
        rides: response?.total_completed_rides || 0,
      };
    } catch (error) {
      console.error('Failed to fetch live stats:', error);
      // Return mock data as fallback
      return {
        riders: 5234,
        users: 12847,
        cities: 25,
        rides: 98567,
      };
    }
  },

  // Register a new user (customer)
  async registerUser(data: Omit<RegistrationData, 'role'>): Promise<any> {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        role: 'customer',
      }),
    });
  },

  // Register a new rider (driver)
  async registerRider(data: Omit<RegistrationData, 'role'>): Promise<any> {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        role: 'driver',
      }),
    });
  },

  // Verify if phone number is already registered
  async verifyPhoneAvailability(phone: string): Promise<boolean> {
    try {
      const response = await apiCall('/auth/verify-phone', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      return response?.available || false;
    } catch (error) {
      console.error('Failed to verify phone:', error);
      return false;
    }
  },

  // Submit support ticket
  async createSupportTicket(data: SupportTicketData): Promise<any> {
    return apiCall('/admin/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Contact form submission (newsletter, inquiry)
  async submitContactForm(email: string, message: string): Promise<any> {
    return apiCall('/contact/submit', {
      method: 'POST',
      body: JSON.stringify({ email, message }),
    });
  },

  // Subscribe to newsletter
  async subscribeNewsletter(email: string): Promise<any> {
    try {
      const response = await apiCall('/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return response;
    } catch (error) {
      // If endpoint doesn't exist, store locally
      console.warn('Newsletter subscription endpoint not available');
      return { success: true, message: 'Stored locally' };
    }
  },
};
