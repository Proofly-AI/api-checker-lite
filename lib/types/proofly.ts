// lib/types/proofly.ts
export interface FileUploadResponse {
  message: string;
  uuid: string;
}

export interface FaceInfo {
  is_real_model_1: number;
  is_real_model_2: number;
  is_real_model_3: number;
  is_real_model_4: number;
  is_real_model_5: number;
  is_real_model_6: number;
  is_real_model_7: number;
  is_real_model_8: number;
  is_real_model_9: number;
  is_real_model_10: number;
  ansamble: number;
  face_path: string;
  [key: string]: number | string; // Index signature type for accessing model results
}

// Model results in the updated API
export interface ModelResults {
  probability: number;
  [key: string]: any;
}

// Data types for Proofly API

// Session status response
export interface SessionStatusResponse {
  status: 'uploading' | 'processing' | 'in progress' | 'completed' | 'done' | 'no faces found' | 'failed';
}

// Session information response
export interface SessionInfoResponse {
  uuid: string;
  sha256?: string; // SHA256 hash of the original image
  image_path?: string; // Path to the uploaded image
  total_faces?: number; // Total number of faces in the original image
  status: 'uploading' | 'processing' | 'in progress' | 'completed' | 'done' | 'no faces found' | 'failed';
  faces?: Array<{
    realProbability: number;
    fakeProbability: number;
    isReal: boolean;
    face_id: string;
    confidence: number;
    verdict: string;
    metrics?: {
      [key: string]: {
        name: string;
        probability: number;
      }
    }
    models?: {
      [key: string]: ModelResults
    }
    is_real_model_1?: number;
    is_real_model_2?: number;
    is_real_model_3?: number;
    is_real_model_4?: number;
    is_real_model_5?: number;
    is_real_model_6?: number;
    is_real_model_7?: number;
    is_real_model_8?: number;
    is_real_model_9?: number;
    is_real_model_10?: number;
    ansamble?: number;
    face_path?: string;
    [key: string]: any; // For additional fields
  }>;
  created_at?: string;
  processed_at?: string;
  error?: string;
}

// Model information
export interface ModelInfo {
  id: string;
  name: string;
  version: string;
}

// Metrics information
export interface MetricsInfo {
  [key: string]: {
    probability: number;
    name: string;
  }
}

export interface StatusResponse {
  status: SessionStatus;
}

// All statuses from API (according to the template client)
export type SessionStatus = 
  | 'uploading'       // File is uploading
  | 'processing'      // File is processing
  | 'in progress'     // Alternative to processing
  | 'completed'       // Processing completed
  | 'done'            // Alternative to completed
  | 'failed'          // Processing failed
  | 'no faces found'; // No faces found

// Type for model results
export interface ModelProbability {
  model: string;
  realProbability: number;
  fakeProbability: number;
}

// Formatted analysis result for display
export interface AnalysisResult {
  faceIndex: number;
  facePath: string;
  ensembleProbability: {
    real: number;
    fake: number;
  };
  modelProbabilities: ModelProbability[];
  verdict: string;
}

// Helper functions for formatting results
export function formatAnalysisResults(sessionInfo: SessionInfoResponse): AnalysisResult[] {
  if (!sessionInfo.faces || sessionInfo.faces.length === 0) {
    return [];
  }
  
  return sessionInfo.faces.map((face, index) => {
    // Calculate real/fake probability
    // Use either the provided ansamble field or realProbability
    const ensembleReal = face.ansamble !== undefined ? face.ansamble : face.realProbability;
    const ensembleFake = 1 - ensembleReal;
    
    // Create array of models
    let modelProbabilities: ModelProbability[] = [];
    
    // Check if there are individual models in the data
    const hasModelProbabilities = Object.keys(face).some(key => key.startsWith('is_real_model_'));
    
    if (hasModelProbabilities) {
      // Format results from all models if available
      modelProbabilities = Array.from({ length: 10 }, (_, i) => {
        const modelNumber = i + 1;
        const modelKey = `is_real_model_${modelNumber}`;
        // If data for this model exists - use it, otherwise use default value
        const realProb = face[modelKey] !== undefined ? face[modelKey] as number : 0.5;
        
        return {
          model: `Model ${modelNumber}`,
          realProbability: realProb,
          fakeProbability: 1 - realProb
        };
      });
    } else if (face.metrics) {
      // If metrics exist - use them instead of models
      modelProbabilities = Object.entries(face.metrics).map(([key, metric]) => {
        return {
          model: metric.name,
          realProbability: metric.probability,
          fakeProbability: 1 - metric.probability
        };
      });
    }
    
    // Determine verdict based on ensemble probability
    // If verdict already exists - use it
    let verdict = face.verdict || '';
    if (!verdict) {
      if (ensembleReal > 0.95) {
        verdict = 'Likely Real';
      } else if (ensembleReal > 0.7) {
        verdict = 'Probably Real';
      } else if (ensembleReal > 0.3) {
        verdict = 'Uncertain';
      } else if (ensembleReal > 0.05) {
        verdict = 'Probably Deepfake';
      } else {
        verdict = 'Likely Deepfake';
      }
    }
    
    return {
      faceIndex: index + 1,
      facePath: face.face_path || '',
      ensembleProbability: {
        real: ensembleReal,
        fake: ensembleFake
      },
      modelProbabilities,
      verdict
    };
  });
}