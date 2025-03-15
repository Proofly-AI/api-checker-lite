// components/proofly/AnalysisResults.tsx
'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SessionInfoResponse, 
  FaceInfo, 
  formatAnalysisResults, 
  AnalysisResult 
} from '@/lib/types/proofly';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Info, AlertTriangle, Download, Copy, Check, FileText } from 'lucide-react';
import { prooflyApi } from '@/lib/api/proofly';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { exportResultsToPDF } from '@/lib/utils/pdfExport';

// Animation for results card appearance
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

// Animation for card child elements
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

interface AnalysisResultsProps {
  sessionInfo?: SessionInfoResponse;
  isLoading?: boolean;
  error?: string;
}

export function AnalysisResults({ 
  sessionInfo, 
  isLoading = false,
  error
}: AnalysisResultsProps) {
  const [imageError, setImageError] = useState<string | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Create ref for the analysis results container
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Function to copy text to clipboard
  const copyToClipboard = (text: string, type: 'uuid' | 'sha') => {
    navigator.clipboard.writeText(text)
      .then(() => {
        if (type === 'uuid') {
          setCopiedUuid(true);
          setTimeout(() => setCopiedUuid(false), 2000);
        } else {
          setCopiedSha(true);
          setTimeout(() => setCopiedSha(false), 2000);
        }
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  // Format analysis results
  const analysisResults = sessionInfo ? formatAnalysisResults(sessionInfo) : [];
  
  // Get original image URL
  const originalImageUrl = sessionInfo?.uuid 
    ? prooflyApi.getOriginalImageUrl(sessionInfo.uuid)
    : '';

  // Function to export results to PDF
  const handleExportPDF = async () => {
    if (!sessionInfo) return;
    
    setIsExportingPdf(true);
    toast.loading('Generating PDF report...');
    
    try {
      // Call the dedicated PDF export function
      const result = await exportResultsToPDF(sessionInfo);
      
      toast.dismiss();
      
      if (result.success) {
        toast.success(result.error 
          ? `PDF report created with limitations: ${result.error}` 
          : 'PDF report successfully created');
      } else {
        toast.error(`Error creating PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast.dismiss();
      toast.error('Error generating PDF report');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // If loading or error - show appropriate states
  if (isLoading) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Skeleton className="h-[250px] w-full rounded-lg" />
            <div className="flex space-x-2 mt-2">
              <Skeleton className="h-10 w-16 rounded" />
              <Skeleton className="h-10 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Analysis Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>An error occurred</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!sessionInfo) {
    return null;
  }

  // Function to handle clicking on "Original image" badge
  const handleDownloadOriginal = () => {
    if (!originalImageUrl) return;
    
    const link = document.createElement('a');
    link.href = originalImageUrl;
    link.download = `original-${sessionInfo.uuid}.jpg`; // Set file name
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="w-full mt-6">
        <CardHeader className="pb-4 relative flex flex-row items-center justify-between">
          <motion.div variants={itemVariants}>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              {sessionInfo.status === 'no faces found' 
                ? 'No faces detected in the image' 
                : 'Details of the deepfake detection analysis'}
            </CardDescription>
          </motion.div>
          <motion.div variants={itemVariants} className="flex gap-2">
            <Badge 
              variant="outline" 
              className="cursor-pointer flex items-center gap-1 hover:bg-secondary transition-colors"
              onClick={handleDownloadOriginal}
            >
              <Download className="h-3 w-3" /> 
              Original Image
            </Badge>
            <Badge 
              variant="outline" 
              className={cn(
                "cursor-pointer flex items-center gap-1 hover:bg-secondary transition-colors",
                isExportingPdf && "opacity-50 pointer-events-none"
              )}
              onClick={handleExportPDF}
            >
              <FileText className="h-3 w-3" /> 
              {isExportingPdf ? 'Creating PDF...' : 'PDF'}
            </Badge>
          </motion.div>
        </CardHeader>
        <CardContent>
          <div ref={resultsRef}>
            {(!sessionInfo.faces || sessionInfo.faces.length === 0) && (
              <motion.div 
                variants={itemVariants}
                className="text-center py-8"
              >
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Information</AlertTitle>
                  <AlertDescription>
                    No faces detected in the image
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* If faces are detected - display tabs with results for each */}
            {sessionInfo.faces && sessionInfo.faces.length > 0 && (
              <motion.div variants={itemVariants}>
                <Tabs defaultValue={`face-0`} className="w-full">
                  <TabsList className="mb-4">
                    <AnimatePresence>
                      {analysisResults.map((result, index) => (
                        <motion.div
                          key={`tab-${index}`}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <TabsTrigger value={`face-${index}`}>
                            Face {result.faceIndex}
                          </TabsTrigger>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </TabsList>

                  {analysisResults.map((result, index) => (
                    <TabsContent key={index} value={`face-${index}`}>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`face-content-${index}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FaceAnalysisResult result={result} sessionUuid={sessionInfo.uuid} />
                        </motion.div>
                      </AnimatePresence>
                    </TabsContent>
                  ))}
                </Tabs>
              </motion.div>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground flex flex-col items-start gap-1">
          <motion.div 
            variants={itemVariants}
            className="flex items-center gap-2 w-full"
          >
            <p className="text-xs break-all pr-2">Session UUID: {sessionInfo.uuid}</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => copyToClipboard(sessionInfo.uuid, 'uuid')}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background p-1 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
                    aria-label="Copy UUID"
                  >
                    {copiedUuid ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copiedUuid ? 'Copied!' : 'Copy UUID'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
          {sessionInfo.sha256 && (
            <motion.div 
              variants={itemVariants}
              className="flex items-center gap-2 w-full"
            >
              <p className="text-xs break-all pr-2">SHA256 hash: {sessionInfo.sha256}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => copyToClipboard(sessionInfo.sha256 as string, 'sha')}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background p-1 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
                      aria-label="Copy SHA256"
                    >
                      {copiedSha ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copiedSha ? 'Copied!' : 'Copy SHA256'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

interface FaceAnalysisResultProps {
  result: AnalysisResult;
  sessionUuid: string;
}

function FaceAnalysisResult({ result, sessionUuid }: FaceAnalysisResultProps) {
  const [faceImageError, setFaceImageError] = useState<boolean>(false);
  
  // Get face image URL
  const faceImageUrl = prooflyApi.getFaceImageUrl(sessionUuid, result.faceIndex - 1);

  // Determine verdict color
  const verdictColor = result.ensembleProbability.real > 0.7 
    ? "text-green-600" 
    : result.ensembleProbability.real < 0.3 
      ? "text-red-600" 
      : "text-amber-600";

  // Determine progress indicator class
  const getProgressClass = (value: number) => {
    if (value > 0.7) return "bg-green-500";
    if (value < 0.3) return "bg-red-500";
    return "bg-amber-500";
  };

  // Format percentages
  const formatPercent = (value: number) => {
    return (value * 100).toFixed(2) + '%';
  };

  return (
    <div className="space-y-6">
      {/* Face image and verdict */}
      <div className="flex flex-col md:flex-row gap-6">
        {faceImageUrl && !faceImageError ? (
          <div className="md:w-1/3">
            <img
              src={faceImageUrl}
              alt={`Face ${result.faceIndex}`}
              className="w-full h-auto rounded-lg border"
              onError={() => setFaceImageError(true)}
            />
          </div>
        ) : faceImageError ? (
          <div className="md:w-1/3">
            <Alert className="border-amber-500 text-amber-700 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Failed to load face image
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="md:w-2/3 space-y-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">Verdict</h3>
            <p className={`text-2xl font-bold ${verdictColor}`}>{result.verdict}</p>
          </div>

          <div>
            <h4 className="font-medium mb-1">Real Image Probability</h4>
            <Progress 
              value={result.ensembleProbability.real * 100} 
              className={cn("h-2", getProgressClass(result.ensembleProbability.real))}
            />
            <div className="flex justify-between text-sm mt-1">
              <span>{formatPercent(result.ensembleProbability.real)}</span>
              <span>Ensemble model confidence</span>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-1">Deepfake Probability</h4>
            <Progress 
              value={result.ensembleProbability.fake * 100} 
              className={cn("h-2", getProgressClass(1 - result.ensembleProbability.fake))}
            />
            <div className="flex justify-between text-sm mt-1">
              <span>{formatPercent(result.ensembleProbability.fake)}</span>
              <span>Ensemble model confidence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Individual model results */}
      <div>
        <h3 className="text-lg font-medium mb-3">Individual Model Results</h3>
        <div className="space-y-3">
          {result.modelProbabilities.map((model, idx) => (
            <div key={idx}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{model.model}</span>
                <span className="text-sm">{formatPercent(model.realProbability)}</span>
              </div>
              <Progress 
                value={model.realProbability * 100} 
                className={cn("h-2", getProgressClass(model.realProbability))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}