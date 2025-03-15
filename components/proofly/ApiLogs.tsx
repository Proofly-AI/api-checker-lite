'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { apiLogs } from '@/lib/api/proofly';

export function ApiLogs() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'info'>('all');
  
  // Filter logs
  const filteredLogs = filter === 'all' 
    ? apiLogs
    : apiLogs.filter(log => log.type === filter);
  
  // Format time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get color for log type
  const getTypeColor = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success': return 'bg-green-50 text-green-700 border-green-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed bottom-4 right-4 z-50"
        >
          API Logs
          <Badge variant="outline" className="ml-2">
            {apiLogs.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>API Logs</DialogTitle>
          <div className="flex space-x-2 mt-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('all')}
            >
              All ({apiLogs.length})
            </Button>
            <Button 
              variant={filter === 'success' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('success')}
            >
              Success ({apiLogs.filter(l => l.type === 'success').length})
            </Button>
            <Button 
              variant={filter === 'error' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('error')}
            >
              Errors ({apiLogs.filter(l => l.type === 'error').length})
            </Button>
            <Button 
              variant={filter === 'info' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('info')}
            >
              Info ({apiLogs.filter(l => l.type === 'info').length})
            </Button>
          </div>
        </DialogHeader>
        
        {/* Using regular div with overflow instead of ScrollArea */}
        <div className="flex-1 overflow-auto mt-4 pr-2">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No logs to display
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded border ${getTypeColor(log.type)}`}
                >
                  <div className="flex justify-between mb-1">
                    <div className="font-semibold">{log.endpoint}</div>
                    <div className="text-xs opacity-70">{formatTime(log.timestamp)}</div>
                  </div>
                  <pre className="text-xs overflow-auto bg-white/40 p-2 rounded max-h-[300px]">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 