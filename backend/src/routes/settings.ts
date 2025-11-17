/**
 * System Settings Routes
 * Handles system-wide configuration settings (admin only)
 */

import express, { Request, Response } from 'express';
import { SystemSettingsRepository } from '../models/SystemSettingsRepository';
import { authenticateToken } from '../middleware/auth';

// Add request logging middleware
const logAllRequests = (req: Request, res: Response, next: Function) => {
  if (req.url.includes('bulk')) {
    console.error('🌐🌐🌐 INCOMING REQUEST TO BULK ENDPOINT 🌐🌐🌐');
    console.error('📝 Method:', req.method);
    console.error('📝 URL:', req.url);
    console.error('📝 Headers:', JSON.stringify(req.headers, null, 2));
    console.error('📝 Body:', JSON.stringify(req.body, null, 2));
  }
  next();
};

const router = express.Router();

// Apply logging to all routes
router.use(logAllRequests);

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  
  if (req.url.includes('bulk')) {
    console.error('👑👑👑 ADMIN CHECK - BULK REQUEST 👑👑👑');
    console.error('👤 User from token:', user);
    console.error('🔍 User type:', user?.user_type);
  }
  
  if (user.user_type !== 'admin') {
    console.error('❌ ADMIN CHECK FAILED - User type:', user?.user_type);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  
  if (req.url.includes('bulk')) {
    console.error('✅ ADMIN CHECK PASSED');
  }
  next();
};

/**
 * Get all system settings
 * GET /api/settings
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettingsRepository.getAllSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings'
    });
  }
});

/**
 * Get security settings
 * GET /api/settings/security
 */
router.get('/security', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const securitySettings = await SystemSettingsRepository.getSecuritySettings();

    res.json({
      success: true,
      data: securitySettings
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security settings'
    });
  }
});

/**
 * Get a specific setting by key
 * GET /api/settings/:key
 */
router.get('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const setting = await SystemSettingsRepository.getSettingByKey(key);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting'
    });
  }
});

/**
 * Update multiple settings at once  
 * PUT /api/settings/bulk
 */
router.put('/bulk', (req: Request, res: Response, next: Function) => {
  console.error('🔥🔥🔥 BULK ROUTE HIT - BEFORE AUTH 🔥🔥🔥');
  next();
}, authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  console.log('\n'.repeat(3));
  console.log('='.repeat(80));
  console.log('🚀🚀🚀 BULK SETTINGS UPDATE STARTED 🚀🚀🚀');
  console.log('='.repeat(80));
  console.log('📅 Timestamp:', new Date().toISOString());
  
  try {
    const requestBody = req.body;
    const userId = (req as any).user?.userId;

    console.error('🔥 FORCE LOG - Raw request body:', JSON.stringify(requestBody, null, 2));
    console.error('🔥 FORCE LOG - User ID:', userId);
    console.error('🔥 FORCE LOG - Request method:', req.method);
    console.error('🔥 FORCE LOG - Request URL:', req.url);

    // Extract settings from request body
    const { settings } = requestBody;
    
    console.log('⚙️ Settings extracted:', settings);
    console.log('📊 Settings type:', typeof settings);
    console.log('📊 Settings is array:', Array.isArray(settings));

    // Basic validation
    if (!settings) {
      console.error('🔥 FORCE ERROR - No settings provided in request body');
      console.error('🔥 FORCE ERROR - RequestBody keys:', Object.keys(requestBody || {}));
      return res.status(400).json({
        success: false,
        message: 'Settings are required'
      });
    }

    if (!Array.isArray(settings)) {
      console.error('❌ Settings is not an array:', typeof settings);
      return res.status(400).json({
        success: false,
        message: 'Settings must be an array'
      });
    }

    if (settings.length === 0) {
      console.error('❌ Empty settings array provided');
      return res.status(400).json({
        success: false,
        message: 'Settings array cannot be empty'
      });
    }

    if (!userId) {
      console.error('❌ No user ID found in request');
      return res.status(400).json({
        success: false,
        message: 'User authentication required'
      });
    }

    console.log(`✅ Basic validation passed. Processing ${settings.length} settings...`);

    // Validate and process each setting
    const processedSettings: { key: string; value: string }[] = [];
    
    for (let i = 0; i < settings.length; i++) {
      const setting = settings[i];
      console.log(`🔍 Processing setting ${i + 1}/${settings.length}:`, setting);

      if (!setting || typeof setting !== 'object') {
        console.error(`❌ Setting ${i + 1} is not a valid object:`, setting);
        return res.status(400).json({
          success: false,
          message: `Setting at index ${i} must be an object`
        });
      }

      const { key, value } = setting;
      
      console.log(`  📝 Key: "${key}" (type: ${typeof key})`);
      console.log(`  📝 Value: "${value}" (type: ${typeof value})`);

      if (!key || typeof key !== 'string' || key.trim() === '') {
        console.error(`❌ Invalid key for setting ${i + 1}:`, key);
        return res.status(400).json({
          success: false,
          message: `Setting at index ${i} must have a valid key`
        });
      }

      if (value === undefined || value === null) {
        console.error(`❌ Invalid value for setting ${i + 1} (key: ${key}):`, value);
        return res.status(400).json({
          success: false,
          message: `Setting "${key}" must have a value`
        });
      }

      // Convert value to string if it's not already
      const stringValue = String(value);
      
      console.log(`  ✅ Processed: ${key} = "${stringValue}"`);
      
      processedSettings.push({
        key: key.trim(),
        value: stringValue
      });
    }

    console.log('📋 Final processed settings:', processedSettings);

    // Update settings in database
    console.log('💾 Calling SystemSettingsRepository.updateMultipleSettings...');
    const updatedSettings = await SystemSettingsRepository.updateMultipleSettings(
      processedSettings,
      userId
    );

    console.log('✅ Database update successful. Updated settings:', updatedSettings.length);

    res.json({
      success: true,
      message: `${updatedSettings.length} setting(s) updated successfully`,
      data: updatedSettings
    });

  } catch (error) {
    console.error('💥 Error in bulk settings update:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating settings'
    });
  }
});

/**
 * Update a single setting
 * PUT /api/settings/:key
 */
router.put('/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = (req as any).user.userId;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Setting value is required'
      });
    }

    // Validate setting value based on key
    if (key === 'session_timeout_minutes' || 
        key === 'password_expiry_days' || 
        key === 'password_min_length' ||
        key === 'max_failed_login_attempts' ||
        key === 'account_lock_duration_minutes') {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        return res.status(400).json({
          success: false,
          message: 'Value must be a non-negative number'
        });
      }
    }

    if (key === 'require_password_change_on_first_login') {
      if (value !== 'true' && value !== 'false') {
        return res.status(400).json({
          success: false,
          message: 'Value must be "true" or "false"'
        });
      }
    }

    const updatedSetting = await SystemSettingsRepository.updateSetting(key, {
      settingValue: String(value),
      updatedBy: userId
    });

    if (!updatedSetting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: updatedSetting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting'
    });
  }
});

export default router;
