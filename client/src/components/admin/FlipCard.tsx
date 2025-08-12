import React, { useState } from 'react';
import { Users, Clock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface VisitorModalProps {
  frontContent: React.ReactNode;
  className?: string;
  visitors?: Array<{
    ip_address: string;
    country: string;
    language: string;
    last_visit: string;
    user_agent: string;
  }>;
}

export function FlipCard({ frontContent, className = "", visitors = [] }: VisitorModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown';
    }
  };

  return (
    <>
      {/* CLICKABLE CARD */}
      <div 
        className={`cursor-pointer transition-transform hover:scale-105 ${className}`}
        onClick={handleCardClick}
      >
        {frontContent}
      </div>

      {/* VISITOR DETAILS MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6" />
              Recent Visitors Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-4">
              Last 5 unique visitors • Total: {visitors.length}
            </div>
            
            <div className="space-y-3">
              {visitors.length > 0 ? (
                visitors.map((visitor, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          🌍
                        </div>
                        <div className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                          {visitor.language?.toUpperCase() || 'UN'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {visitor.ip_address || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {visitor.country || 'Unknown'} • {visitor.language || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1 rounded border">
                      <Clock className="h-4 w-4" />
                      {formatDate(visitor.last_visit)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent visitors found</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}