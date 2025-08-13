import React, { useState, useEffect } from 'react';
import { Users, Clock, X } from 'lucide-react';
import { CountryFlag } from './CountryFlag';

interface VisitorModalProps {
  frontContent: React.ReactNode;
  className?: string;
  visitors?: Array<{
    ip_address: string;
    country: string;
    region?: string;
    city?: string;
    country_code?: string;
    timezone?: string;
    organization?: string;
    language: string;
    last_visit: string;
    user_agent: string;
    visit_count?: number;
    session_duration?: number;
    previous_visit?: string;
  }>;
}

export function FlipCard({ frontContent, className = "", visitors = [] }: VisitorModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        handleModalClose();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen]);

  // Click outside handler
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleModalClose();
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 5) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Just now';
    }
  };

  return (
    <>
      {/* CLICKABLE CARD */}
      <div 
        className={`cursor-pointer transition-transform hover:scale-105 ${className} border-4 border-green-500 bg-green-100 shadow-green-300 shadow-lg`}
        onClick={handleCardClick}
        style={{ border: '4px solid green', backgroundColor: '#f0fdf4', boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)' }}
      >
        <div style={{ padding: '4px', border: '2px solid green', borderRadius: '8px' }}>
          {frontContent}
        </div>
      </div>

      {/* CUSTOM MODAL WITH ABSOLUTE POSITIONING */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleBackdropClick}
        >
          {/* MODAL CONTENT WITH SOLID BACKGROUND */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER WITH CLOSE BUTTON */}
            <div style={{
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '20px',
                fontWeight: '600',
                color: '#111827'
              }}>
                <Users style={{ width: '24px', height: '24px' }} />
                Recent Visitors Details
              </div>
              <button
                onClick={handleModalClose}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            
            {/* MODAL BODY */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '12px'
              }}>
                Last 5 unique visitors • Total: {visitors.length}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {visitors.length > 0 ? (
                  visitors.map((visitor, index) => (
                    <div 
                      key={visitor.ip_address || `visitor-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CountryFlag country={visitor.country_code || visitor.country} size={32} />
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: '500',
                            color: '#111827',
                            fontSize: '14px',
                            marginBottom: '2px'
                          }}>
                            {visitor.city && visitor.region 
                              ? `${visitor.city} (${visitor.region})` 
                              : visitor.city || visitor.region || visitor.ip_address || 'Unknown'}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}>
                            <span>{visitor.language || 'Unknown'}</span>
                            <span style={{ 
                              backgroundColor: (visitor.visit_count || 1) > 1 ? '#dcfce7' : '#fef3c7',
                              color: (visitor.visit_count || 1) > 1 ? '#166534' : '#92400e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {(visitor.visit_count || 1) > 1 ? 'Returning' : 'New'}
                            </span>
                            {(visitor.visit_count || 1) > 1 && (
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                {visitor.visit_count} visits
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            color: '#9ca3af',
                            marginTop: '2px',
                            fontFamily: 'monospace'
                          }}>
                            {visitor.ip_address}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#6b7280',
                        backgroundColor: '#ffffff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        minWidth: '120px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock style={{ width: '14px', height: '14px' }} />
                          {formatDate(visitor.last_visit)}
                        </div>
                        {visitor.session_duration && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}>
                            <span>⏱</span>
                            {formatDuration(visitor.session_duration)}
                          </div>
                        )}
                        {visitor.previous_visit && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#9ca3af',
                            textAlign: 'center'
                          }}>
                            Prev: {formatDate(visitor.previous_visit)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px',
                    color: '#6b7280'
                  }}>
                    <Users style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 12px auto',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No recent visitors found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}