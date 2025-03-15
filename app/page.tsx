'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { AnalysisResults } from '@/components/proofly/AnalysisResults';
import { ApiLogs } from '@/components/proofly/ApiLogs';
import { FileUrlInputNew } from '@/components/proofly/FileUrlInputNew';
import { SessionInfoResponse } from '@/lib/types/proofly';
import { RefreshCw } from 'lucide-react';
import { Footer } from '@/components/ui/Footer';

// Define interaction stage types
type AppStage = 'initial' | 'uploading' | 'processing' | 'results' | 'error';

// Main component for the application
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<SessionInfoResponse | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);
  
  // Add state for tracking the current stage
  const [currentStage, setCurrentStage] = useState<AppStage>('initial');

  // Effect for tracking changes in other states and updating currentStage
  useEffect(() => {
    if (error) {
      setCurrentStage('error');
    } else if (sessionInfo && !isProcessing) {
      setCurrentStage('results');
    } else if (isProcessing) {
      setCurrentStage('processing');
    } else if (isUploading) {
      setCurrentStage('uploading');
    } else if (!file && !sessionInfo) {
      setCurrentStage('initial');
    }
  }, [error, sessionInfo, isProcessing, isUploading, file]);

  // Function to handle analysis completion
  const handleAnalysisComplete = (completedSessionInfo: SessionInfoResponse) => {
    setSessionInfo(completedSessionInfo);
    setCurrentStage('results');
  };

  // Function to return to the beginning to upload a new image
  const handleNewUpload = () => {
    setFile(null);
    setSessionInfo(undefined);
    setError(undefined);
    setSessionUuid(null);
    setCurrentStage('initial');
  };

  return (
    <main className="container mx-auto px-4 md:px-6 lg:px-8 min-h-screen flex flex-col pb-28">
      <div className="flex-grow py-8">
        <div className="text-center mb-8">
          <p className="text-muted-foreground">
            Upload an image for deepfake detection analysis
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {currentStage === 'initial' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <FileUrlInputNew onAnalysisComplete={handleAnalysisComplete} />
              </motion.div>
            )}
            
            {/* Show analysis results */}
            {currentStage === 'results' && sessionInfo && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* "Upload new image" button above results */}
                <div className="mb-4 flex justify-center">
                  <Button
                    onClick={handleNewUpload}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Upload new image
                  </Button>
                </div>
                
                <AnalysisResults 
                  sessionInfo={sessionInfo}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Component for displaying API logs */}
        <ApiLogs />
      </div>
      
      {/* Footer component */}
      <Footer />
    </main>
  );
}