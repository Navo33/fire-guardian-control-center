import { pool } from '../config/database';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  priority: 'low' | 'normal' | 'high';
  category: string;
  is_read: boolean;
  is_archived: boolean;
  read_at?: string;
  action_url?: string;
  metadata?: any;
  created_at: string;
  expires_at?: string;
}

export interface NotificationKPIs {
  total_notifications: number;
  unread_notifications: number;
  recent_notifications: number;
}

export interface CreateNotificationData {
  user_id: number;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'alert';
  priority?: 'low' | 'normal' | 'high';
  category: string;
  action_url?: string;
  metadata?: any;
  expires_at?: string;
}

export class NotificationRepository {
  
  /**
   * Get notifications for a specific user with pagination
   */
  static async getUserNotifications(
    userId: number,
    options: {
      limit?: number;
      offset?: number;
      unread_only?: boolean;
      category?: string;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const { limit = 20, offset = 0, unread_only = false, category } = options;
      
      let whereConditions = ['user_id = $1', 'is_archived = false'];
      const params: any[] = [userId];
      let paramIndex = 2;

      if (unread_only) {
        whereConditions.push('is_read = false');
      }

      if (category) {
        whereConditions.push(`category = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      // Add expiry check
      whereConditions.push('(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)');

      const countQuery = `
        SELECT COUNT(*) as total
        FROM public.notification
        WHERE ${whereConditions.join(' AND ')}
      `;

      const query = `
        SELECT 
          id, user_id, title, message, type, priority, category,
          is_read, is_archived, read_at, action_url, metadata,
          created_at, expires_at
        FROM public.notification
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const [countResult, notificationsResult] = await Promise.all([
        pool.query(countQuery, params.slice(0, -2)),
        pool.query(query, params)
      ]);

      return {
        notifications: notificationsResult.rows,
        total: parseInt(countResult.rows[0].total)
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification KPIs for a user
   */
  static async getUserNotificationKPIs(userId: number): Promise<NotificationKPIs> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
          COUNT(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as recent_notifications
        FROM public.notification
        WHERE user_id = $1 
          AND is_archived = false
          AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;

      const result = await pool.query(query, [userId]);
      return {
        total_notifications: parseInt(result.rows[0].total_notifications),
        unread_notifications: parseInt(result.rows[0].unread_notifications),
        recent_notifications: parseInt(result.rows[0].recent_notifications)
      };
    } catch (error) {
      console.error('Error getting notification KPIs:', error);
      throw error;
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      const query = `
        INSERT INTO public.notification (
          user_id, title, message, type, priority, category,
          action_url, metadata, expires_at, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
        ) RETURNING 
          id, user_id, title, message, type, priority, category,
          is_read, is_archived, read_at, action_url, metadata,
          created_at, expires_at
      `;

      const result = await pool.query(query, [
        data.user_id,
        data.title,
        data.message,
        data.type || 'info',
        data.priority || 'normal',
        data.category,
        data.action_url,
        data.metadata ? JSON.stringify(data.metadata) : null,
        data.expires_at
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    try {
      const query = `
        UPDATE public.notification
        SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND is_read = false
        RETURNING id
      `;

      const result = await pool.query(query, [notificationId, userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: number): Promise<number> {
    try {
      const query = `
        UPDATE public.notification
        SET is_read = true, read_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = false
        RETURNING id
      `;

      const result = await pool.query(query, [userId]);
      return result.rows.length;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId: number, userId: number): Promise<boolean> {
    try {
      const query = `
        UPDATE public.notification
        SET is_archived = true
        WHERE id = $1 AND user_id = $2
        RETURNING id
      `;

      const result = await pool.query(query, [notificationId, userId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  /**
   * Create ticket-related notifications
   */
  static async createTicketNotifications(ticketData: {
    ticket_id: number;
    ticket_number: string;
    client_id?: number;
    vendor_id: number;
    action: 'created' | 'updated' | 'resolved' | 'closed';
    issue_description?: string;
    assigned_technician?: number;
  }): Promise<void> {
    try {
      const notifications: CreateNotificationData[] = [];

      // Get user IDs for client and vendor
      const clientUserQuery = ticketData.client_id ? 
        `SELECT user_id FROM public.clients WHERE id = $1` : null;
      const vendorUserQuery = `SELECT user_id FROM public.vendors WHERE id = $1`;

      const [clientResult, vendorResult] = await Promise.all([
        clientUserQuery ? pool.query(clientUserQuery, [ticketData.client_id]) : null,
        pool.query(vendorUserQuery, [ticketData.vendor_id])
      ]);

      const vendorUserId = vendorResult.rows[0]?.user_id;
      const clientUserId = clientResult?.rows[0]?.user_id;

      // Create notifications based on action
      switch (ticketData.action) {
        case 'created':
          // Notify vendor when client creates ticket
          if (vendorUserId && clientUserId) {
            notifications.push({
              user_id: vendorUserId,
              title: 'New Service Request',
              message: `A new service request ${ticketData.ticket_number} has been created by your client.`,
              type: 'info',
              priority: 'normal',
              category: 'ticket',
              action_url: `/maintenance-tickets/${ticketData.ticket_id}`,
              metadata: { ticket_id: ticketData.ticket_id, ticket_number: ticketData.ticket_number }
            });
          }
          break;

        case 'updated':
          // Notify client when vendor updates ticket
          if (clientUserId) {
            notifications.push({
              user_id: clientUserId,
              title: 'Service Request Updated',
              message: `Your service request ${ticketData.ticket_number} has been updated.`,
              type: 'info',
              priority: 'normal',
              category: 'ticket',
              action_url: `/service-requests/${ticketData.ticket_id}`,
              metadata: { ticket_id: ticketData.ticket_id, ticket_number: ticketData.ticket_number }
            });
          }
          break;

        case 'resolved':
          // Notify client when ticket is resolved
          if (clientUserId) {
            notifications.push({
              user_id: clientUserId,
              title: 'Service Request Resolved',
              message: `Your service request ${ticketData.ticket_number} has been resolved.`,
              type: 'success',
              priority: 'normal',
              category: 'ticket',
              action_url: `/service-requests/${ticketData.ticket_id}`,
              metadata: { ticket_id: ticketData.ticket_id, ticket_number: ticketData.ticket_number }
            });
          }
          break;
      }

      // Create all notifications
      await Promise.all(
        notifications.map(notification => this.createNotification(notification))
      );

    } catch (error) {
      console.error('Error creating ticket notifications:', error);
      throw error;
    }
  }

  /**
   * Create client account notifications
   */
  static async createClientAccountNotifications(clientData: {
    client_id: number;
    vendor_id: number;
    client_name: string;
    action: 'created' | 'approved' | 'deactivated';
  }): Promise<void> {
    try {
      const notifications: CreateNotificationData[] = [];

      // Get user IDs
      const [clientResult, vendorResult] = await Promise.all([
        pool.query(`SELECT user_id FROM public.clients WHERE id = $1`, [clientData.client_id]),
        pool.query(`SELECT user_id FROM public.vendors WHERE id = $1`, [clientData.vendor_id])
      ]);

      const clientUserId = clientResult.rows[0]?.user_id;
      const vendorUserId = vendorResult.rows[0]?.user_id;

      switch (clientData.action) {
        case 'created':
          // Notify vendor when new client account is created
          if (vendorUserId) {
            notifications.push({
              user_id: vendorUserId,
              title: 'New Client Account',
              message: `A new client account for ${clientData.client_name} has been created.`,
              type: 'success',
              priority: 'normal',
              category: 'client',
              action_url: `/clients/${clientData.client_id}`,
              metadata: { client_id: clientData.client_id }
            });
          }

          // Welcome notification for client
          if (clientUserId) {
            notifications.push({
              user_id: clientUserId,
              title: 'Welcome to Fire Guardian!',
              message: `Your account has been set up successfully. You can now manage your fire safety equipment.`,
              type: 'success',
              priority: 'normal',
              category: 'account',
              action_url: `/dashboard`,
              metadata: { client_id: clientData.client_id }
            });
          }
          break;
      }

      // Create all notifications
      await Promise.all(
        notifications.map(notification => this.createNotification(notification))
      );

    } catch (error) {
      console.error('Error creating client account notifications:', error);
      throw error;
    }
  }
}