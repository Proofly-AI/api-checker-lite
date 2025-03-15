'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  title?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorDisplay({ 
  error, 
  title = 'Analysis Error',
  onRetry,
  isRetrying = false
}: ErrorDisplayProps) {
  // Processing common errors for more readable display
  const getReadableError = (errorMessage: string) => {
    if (errorMessage.includes('Network Error')) {
      return 'Could not connect to server. Please check your internet connection and try again.';
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
      return 'Server response timeout. Please try again later.';
    }
    if (errorMessage.includes('ECONNREFUSED')) {
      return 'Server is currently unavailable. Please try again later.';
    }
    if (errorMessage.includes('413') || errorMessage.includes('Payload Too Large')) {
      return 'The uploaded file is too large. Please reduce the file size and try again.';
    }
    if (errorMessage.includes('415') || errorMessage.includes('Unsupported Media Type')) {
      return 'File format is not supported. Please use images in JPEG, PNG or WebP format.';
    }
    if (errorMessage.includes('Error processing image')) {
      return 'An error occurred while analyzing the image. Try uploading a different image.';
    }
    return errorMessage;
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>An error occurred</AlertTitle>
          <AlertDescription>
            {getReadableError(error)}
          </AlertDescription>
        </Alert>
        
        {onRetry && (
          <div className="flex justify-end mt-4">
            <Button 
              onClick={onRetry} 
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 