// lib/api/proofly.ts
import axios from 'axios';
import { SessionInfoResponse, SessionStatusResponse } from '../types/proofly';

// Array for storing API logs
export interface ApiLog {
  timestamp: string;
  type: 'success' | 'error' | 'info';
  endpoint: string;
  details: any;
}

export const apiLogs: ApiLog[] = [];

/**
 * Logs API events
 */
const logApiCall = (
  type: 'success' | 'error' | 'info', 
  endpoint: string, 
  details: any
) => {
  console.log(`[API ${type.toUpperCase()}] ${endpoint}:`, details);
  apiLogs.unshift({
    timestamp: new Date().toISOString(),
    type,
    endpoint,
    details
  });
  
  // Limit logs to 100 entries
  if (apiLogs.length > 100) {
    apiLogs.pop();
  }
};

/**
 * API client for Proofly service, using a local proxy server
 * to bypass CORS restrictions
 */
class ProoflyApi {
  private apiToken: string | null;
  
  constructor() {
    this.apiToken = null;
  }
  
  /**
   * Sets the API token
   */
  setApiToken(token: string): void {
    this.apiToken = token;
  }
  
  /**
   * Uploads an image and creates a session for analysis
   */
  async uploadImage(file: File): Promise<{ uuid: string }> {
    const endpoint = '/api/proofly/upload';
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      logApiCall('info', endpoint, { fileName: file.name, fileSize: file.size });
      
      const response = await axios.post(endpoint, formData);
      
      logApiCall('success', endpoint, response.data);
      
      if (!response.data.uuid) {
        throw new Error('UUID not received from server');
      }
      
      return { uuid: response.data.uuid };
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error);
      logApiCall('error', endpoint, errorDetails);
      throw new Error(`Error uploading image: ${errorDetails.message}`);
    }
  }
  
  /**
   * Sends image URL for analysis
   */
  async uploadUrl(url: string): Promise<{ uuid: string }> {
    const endpoint = '/api/proofly/upload-url';
    try {
      logApiCall('info', endpoint, { url });
      
      const response = await axios.post(endpoint, { url });
      
      logApiCall('success', endpoint, response.data);
      
      if (!response.data.uuid) {
        throw new Error('UUID not received from server');
      }
      
      return { uuid: response.data.uuid };
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error);
      logApiCall('error', endpoint, errorDetails);
      throw new Error(`Error sending URL: ${errorDetails.message}`);
    }
  }
  
  /**
   * Gets session status by ID
   */
  async getSessionStatus(uuid: string): Promise<SessionStatusResponse> {
    const endpoint = `/api/proofly/session/${uuid}/status`;
    try {
      const response = await axios.get(endpoint);
      
      logApiCall('success', endpoint, response.data);
      return response.data;
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error, { uuid });
      logApiCall('error', endpoint, errorDetails);
      throw new Error(`Error getting session status: ${errorDetails.message}`);
    }
  }
  
  /**
   * Gets session information by ID
   */
  async getSessionInfo(uuid: string): Promise<SessionInfoResponse> {
    const endpoint = `/api/proofly/session/${uuid}`;
    try {
      const response = await axios.get(endpoint);
      
      logApiCall('success', endpoint, response.data);
      return response.data;
    } catch (error) {
      const errorDetails = this.extractErrorDetails(error, { uuid });
      logApiCall('error', endpoint, errorDetails);
      throw new Error(`Error getting session information: ${errorDetails.message}`);
    }
  }
  
  /**
   * Gets original image URL through proxy
   */
  getOriginalImageUrl(uuid: string): string {
    // Use local proxy to get the image
    return `/api/proofly/session/${uuid}/original-image`;
  }
  
  /**
   * Gets face image URL through proxy
   */
  getFaceImageUrl(uuid: string, faceIndex: number): string {
    // Use local proxy to get the face image
    return `/api/proofly/session/${uuid}/face/${faceIndex}`;
  }
  
  /**
   * Extracts error details from axios error object
   */
  private extractErrorDetails(error: any, additionalInfo: Record<string, any> = {}): any {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        ...additionalInfo
      };
    } else {
      return {
        message: error instanceof Error ? error.message : 'Unknown error',
        ...additionalInfo
      };
    }
  }
}

// Export a single API instance
export const prooflyApi = new ProoflyApi();