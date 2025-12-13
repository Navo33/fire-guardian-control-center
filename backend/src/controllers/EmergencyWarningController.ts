import { Response } from 'express';
import { BaseController } from './BaseController';
import { ApiResponseUtil } from '../utils/ApiResponse';
import { AuthenticatedRequest } from '../types/api';
import { EmergencyWarningService } from '../services/emergencyWarningService';

/**
 * Emergency Warning Controller
 * Handles fetching emergency warnings from DMC RSS feed
 */
export class EmergencyWarningController extends BaseController {
  
  /**
   * GET /api/emergency-warnings
   * Get latest emergency warnings
   */
  getWarnings = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const warnings = await EmergencyWarningService.fetchWarnings();
      
      if (!warnings) {
        return ApiResponseUtil.error(res, 'Failed to fetch emergency warnings', 500);
      }

      return ApiResponseUtil.success(res, warnings, 'Emergency warnings fetched successfully');
    } catch (error) {
      console.error('Error fetching emergency warnings:', error);
      return ApiResponseUtil.internalError(res);
    }
  });

  /**
   * GET /api/emergency-warnings/latest
   * Get the latest single warning
   */
  getLatestWarning = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const latestWarning = await EmergencyWarningService.getLatestWarning();
      
      if (!latestWarning) {
        return ApiResponseUtil.success(res, null, 'No warnings available');
      }

      return ApiResponseUtil.success(res, latestWarning, 'Latest warning fetched successfully');
    } catch (error) {
      console.error('Error fetching latest warning:', error);
      return ApiResponseUtil.internalError(res);
    }
  });
}
