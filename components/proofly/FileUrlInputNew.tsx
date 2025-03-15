"use client"

import { useState, useRef, useEffect, type ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, Upload, CheckCircle2, FileText, ImageIcon, File, Maximize2, Minimize2, RefreshCw } from "lucide-react"
import { cn, formatFileSize } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { prooflyApi } from '@/lib/api/proofly'
import { SessionInfoResponse } from '@/lib/types/proofly'

type InputType = "file" | "url"
type DisplayMode = "compact" | "thumbnail" | "card" | "minimal"
type AppStage = 'initial' | 'uploading' | 'processing' | 'results' | 'error'

interface FileData {
  file: File
  preview: string | null
  size: number
  type: string
}

interface FileUrlInputNewProps {
  onAnalysisComplete: (sessionInfo: SessionInfoResponse) => void;
}

export function FileUrlInputNew({ onAnalysisComplete }: FileUrlInputNewProps) {
  // UI states
  const [inputType, setInputType] = useState<InputType>("file")
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [url, setUrl] = useState<string>("")
  const [isValidUrl, setIsValidUrl] = useState<boolean>(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("compact")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Processing states
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [sessionUuid, setSessionUuid] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState<AppStage>('initial')

  // Effect to track changes in other states and update currentStage
  useEffect(() => {
    if (error) {
      setCurrentStage('error')
    } else if (isProcessing) {
      setCurrentStage('processing')
    } else if (isUploading) {
      setCurrentStage('uploading')
    } else if (!fileData && url === "" && !sessionUuid) {
      setCurrentStage('initial')
    }
  }, [error, isProcessing, isUploading, fileData, url, sessionUuid])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setFileData({
        file,
        preview: file.type.startsWith("image/") ? (reader.result as string) : null,
        size: file.size,
        type: file.type,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUrl(value)

    // URL validation
    try {
      const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/
      setIsValidUrl(urlPattern.test(value) && value.length > 0)
    } catch {
      setIsValidUrl(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setFileData({
        file,
        preview: file.type.startsWith("image/") ? (reader.result as string) : null,
        size: file.size,
        type: file.type,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleClearFile = () => {
    setFileData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClearUrl = () => {
    setUrl("")
    setIsValidUrl(false)
  }

  const toggleDisplayMode = () => {
    const modes: DisplayMode[] = ["thumbnail", "compact", "card", "minimal"]
    const currentIndex = modes.indexOf(displayMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setDisplayMode(modes[nextIndex])
  }

  // API functions
  const handleSubmit = async () => {
    setError(undefined)
    setIsUploading(true)

    if (inputType === "file" && fileData?.file) {
      await handleFileUpload(fileData.file)
    } else if (inputType === "url" && isValidUrl) {
      await handleUrlUpload(url)
    }
  }

  const handleFileUpload = async (file: File) => {
    console.log("Starting file upload:", file.name, file.size, file.type);
    
    try {
      console.log("Sending file to Proofly API server...");
      
      // Upload file to server
      const response = await prooflyApi.uploadImage(file);
      console.log("API upload response:", response);
      
      if (!response.uuid) {
        throw new Error("API did not return session UUID");
      }
      
      setSessionUuid(response.uuid);
      toast.success('Image uploaded successfully');
      
      // Start checking session status
      setIsUploading(false);
      setIsProcessing(true);
      setCurrentStage('processing');
      await checkSessionStatus(response.uuid);
    } catch (err) {
      console.error('Detailed upload error:', err);
      // More detailed error message for user
      let errorMessage = 'Error uploading image. Please try again.';
      
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        
        // Try to determine error type for better user message
        if (err.message.includes('network') || err.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
          errorMessage = 'Server response timeout.';
        } else if (err.message.includes('413') || err.message.includes('too large')) {
          errorMessage = 'Image is too large.';
        } else if (err.message.includes('415') || err.message.includes('Unsupported')) {
          errorMessage = 'Unsupported image format.';
        }
      }
      
      setError(errorMessage);
      setCurrentStage('error');
      toast.error('Error uploading image');
    } finally {
      setIsUploading(false);
    }
  }

  const handleUrlUpload = async (urlToUpload: string) => {
    console.log("Starting URL processing:", urlToUpload);
    
    try {
      // Send URL to server
      const response = await prooflyApi.uploadUrl(urlToUpload);
      console.log("API URL upload response:", response);
      
      if (!response.uuid) {
        throw new Error("API did not return session UUID");
      }
      
      setSessionUuid(response.uuid);
      toast.success('URL successfully submitted for analysis');
      
      // Start checking session status
      setIsUploading(false);
      setIsProcessing(true);
      setCurrentStage('processing');
      await checkSessionStatus(response.uuid);
    } catch (err) {
      console.error('Error processing URL:', err);
      let errorMessage = 'Error processing URL. Please try again.';
      
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        
        // Analyze error in more detail
        if (err.message.includes('network') || err.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
          errorMessage = 'Server response timeout.';
        } else if (err.message.includes('404') || err.message.includes('not found')) {
          errorMessage = 'URL not found or unavailable.';
        }
      }
      
      setError(errorMessage);
      setCurrentStage('error');
      toast.error('Error processing URL');
    } finally {
      setIsUploading(false);
    }
  }

  const checkSessionStatus = async (uuid: string) => {
    try {
      // Wait for processing to complete
      let status = 'processing';
      let attempts = 0;
      const maxAttempts = 60; // Maximum number of attempts
      
      // Check all possible "in process" statuses
      while ((status === 'processing' || status === 'uploading' || status === 'in progress') && attempts < maxAttempts) {
        // Pause between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check status
        const statusResponse = await prooflyApi.getSessionStatus(uuid);
        status = statusResponse.status;
        console.log(`Current status: ${status}`);
        attempts++;
        
        // If status indicates no faces found, break the loop
        if (status === 'no faces found') {
          break;
        }
      }
      
      // Check that attempts limit is not exceeded
      if (attempts >= maxAttempts) {
        throw new Error('Processing timeout exceeded');
      }
      
      // Handle different completion statuses
      if (status === 'completed' || status === 'done') {
        const sessionData = await prooflyApi.getSessionInfo(uuid);
        onAnalysisComplete(sessionData);
        toast.success('Image analysis completed');
      } else if (status === 'no faces found') {
        // Get session data even if no faces were found
        const sessionData = await prooflyApi.getSessionInfo(uuid);
        onAnalysisComplete(sessionData);
        toast.warning('No faces detected in the image');
      } else if (status === 'failed') {
        throw new Error('Image processing failed');
      }
    } catch (err) {
      console.error('Processing error:', err);
      let errorMessage = 'Error processing image. Please try again.';
      
      if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
      }
      
      setError(errorMessage);
      setCurrentStage('error');
      toast.error('Error processing image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = async () => {
    if (inputType === "file" && fileData?.file) {
      await handleFileUpload(fileData.file);
    } else if (inputType === "url" && isValidUrl) {
      await handleUrlUpload(url);
    } else if (sessionUuid) {
      setIsProcessing(true);
      setCurrentStage('processing');
      try {
        await checkSessionStatus(sessionUuid);
      } catch (err) {
        console.error('Retry error:', err);
        setError('Could not retrieve analysis results. Please try again.');
        setCurrentStage('error');
        toast.error('Analysis retry failed');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-6 h-6" />
    if (type.startsWith("text/")) return <FileText className="w-6 h-6" />
    return <File className="w-6 h-6" />
  }

  const renderFilePreview = () => {
    if (!fileData) return null

    switch (displayMode) {
      case "thumbnail":
        return (
          <div className="relative border border-gray-200 rounded-lg overflow-hidden">
            {fileData.preview ? (
              <div className="relative">
                <img
                  src={fileData.preview || "/placeholder.svg"}
                  alt="Preview"
                  className="max-h-48 max-w-full object-contain mx-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs text-gray-600 bg-white/80">
                  {formatFileSize(fileData.size)}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFile()
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 bg-gray-50">
                {getFileIcon(fileData.type)}
                <span className="ml-2 text-sm text-gray-500">{formatFileSize(fileData.size)}</span>
                <Button
                  variant="destructive"
                  size="icon"
                  className="ml-2 h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFile()
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            )}
          </div>
        )

      case "compact":
        return (
          <div className="flex items-center space-x-3 p-2 border border-gray-200 rounded-lg bg-gray-50">
            {fileData.preview ? (
              <img
                src={fileData.preview || "/placeholder.svg"}
                alt="Preview"
                className="h-10 w-10 object-cover rounded"
              />
            ) : (
              getFileIcon(fileData.type)
            )}
            <span className="text-sm text-gray-500">{formatFileSize(fileData.size)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto"
              onClick={(e) => {
                e.stopPropagation()
                handleClearFile()
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
        )

      case "card":
        return (
          <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            {fileData.preview ? (
              <div className="aspect-video relative bg-gray-100 flex items-center justify-center">
                <img
                  src={fileData.preview || "/placeholder.svg"}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearFile()
                  }}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {getFileIcon(fileData.type)}
              </div>
            )}
            <div className="p-2 text-center text-sm text-gray-500 border-t border-gray-200">
              {formatFileSize(fileData.size)}
            </div>
          </div>
        )

      case "minimal":
        return (
          <div className="flex items-center justify-between p-2 border-b border-gray-200">
            <div className="flex items-center">
              {fileData.preview ? (
                <div className="h-6 w-6 mr-2 rounded overflow-hidden bg-gray-100">
                  <img
                    src={fileData.preview || "/placeholder.svg"}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mr-2">{getFileIcon(fileData.type)}</div>
              )}
              <span className="text-sm text-gray-500">{formatFileSize(fileData.size)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                handleClearFile()
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
        )
    }
  }

  // Render loading/processing/error state
  const renderLoadingState = () => {
    if (isUploading) {
      return (
        <div className="text-center p-6 space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full w-1/2 animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-500">Uploading file...</p>
        </div>
      )
    }

    if (isProcessing) {
      return (
        <div className="text-center p-6 space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-green-600 h-2.5 rounded-full w-3/4 animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-500">Processing data...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center p-6 space-y-4">
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            <p>{error}</p>
          </div>
          <Button 
            onClick={handleRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      )
    }

    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <AnimatePresence mode="wait">
          {isUploading || isProcessing || error ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {renderLoadingState()}
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <Tabs defaultValue="file" onValueChange={(value) => setInputType(value as InputType)}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="file">File</TabsTrigger>
                  <TabsTrigger value="url">URL</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-4">
                  {fileData ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">File preview</span>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={toggleDisplayMode}>
                          {displayMode === "minimal" || displayMode === "compact" ? (
                            <Maximize2 className="h-3 w-3 mr-1" />
                          ) : (
                            <Minimize2 className="h-3 w-3 mr-1" />
                          )}
                          {displayMode.charAt(0).toUpperCase() + displayMode.slice(1)}
                        </Button>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={displayMode}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.2 }}
                        >
                          {renderFilePreview()}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-8 transition-colors hover:border-gray-300 cursor-pointer"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*" 
                      />
                      <div className="flex flex-col items-center text-gray-500">
                        <Upload className="h-10 w-10 mb-2" />
                        <p className="text-sm text-center">Drag and drop an image here or click to select</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center">
                      <div className="relative flex-grow">
                        <Input
                          type="url"
                          placeholder="Enter image URL for analysis"
                          value={url}
                          onChange={handleUrlChange}
                          className="pr-10 border-gray-300 focus:border-black focus:ring-black"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                          {url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-gray-600"
                              onClick={handleClearUrl}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Clear URL</span>
                            </Button>
                          )}
                          {isValidUrl && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {(fileData || isValidUrl) && (
                <Button
                  className="w-full mt-6 bg-black hover:bg-gray-800 text-white"
                  onClick={handleSubmit}
                  disabled={isUploading || isProcessing}
                >
                  {isUploading || isProcessing ? "Processing..." : "Submit for analysis"}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 