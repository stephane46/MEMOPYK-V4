import React, { useState, useEffect } from 'react';
import { Users, Clock, X } from 'lucide-react';

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

  const getCountryFlag = (country: string) => {
    // Map both country names and two-letter codes to flags
    const countryFlags: { [key: string]: string } = {
      // Full country names
      'France': '🇫🇷',
      'Canada': '🇨🇦',
      'United States': '🇺🇸',
      'USA': '🇺🇸',
      'United Kingdom': '🇬🇧',
      'UK': '🇬🇧',
      'Germany': '🇩🇪',
      'Spain': '🇪🇸',
      'Italy': '🇮🇹',
      'Netherlands': '🇳🇱',
      'Belgium': '🇧🇪',
      'Switzerland': '🇨🇭',
      'Austria': '🇦🇹',
      'Portugal': '🇵🇹',
      'Sweden': '🇸🇪',
      'Norway': '🇳🇴',
      'Denmark': '🇩🇰',
      'Finland': '🇫🇮',
      'Poland': '🇵🇱',
      'Czech Republic': '🇨🇿',
      'Australia': '🇦🇺',
      'Japan': '🇯🇵',
      'South Korea': '🇰🇷',
      'Brazil': '🇧🇷',
      'Mexico': '🇲🇽',
      'Argentina': '🇦🇷',
      'India': '🇮🇳',
      'China': '🇨🇳',
      'Russia': '🇷🇺',
      // Two-letter country codes
      'FR': '🇫🇷',
      'CA': '🇨🇦',
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'DE': '🇩🇪',
      'ES': '🇪🇸',
      'IT': '🇮🇹',
      'NL': '🇳🇱',
      'BE': '🇧🇪',
      'CH': '🇨🇭',
      'AT': '🇦🇹',
      'PT': '🇵🇹',
      'SE': '🇸🇪',
      'NO': '🇳🇰',
      'DK': '🇩🇰',
      'FI': '🇫🇮',
      'PL': '🇵🇱',
      'CZ': '🇨🇿',
      'AU': '🇦🇺',
      'JP': '🇯🇵',
      'KR': '🇰🇷',
      'BR': '🇧🇷',
      'MX': '🇲🇽',
      'AR': '🇦🇷',
      'IN': '🇮🇳',
      'CN': '🇨🇳',
      'RU': '🇷🇺'
    };
    
    // Only show globe for truly unknown entries
    if (country === 'Unknown' || !country) {
      return '🌍';
    }
    
    // Return the flag if we have it, otherwise show a generic flag icon for unrecognized countries
    return countryFlags[country] || '🏴';
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
          onClick={handleModalClose}
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
            <div style={{ padding: '24px' }}>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px'
              }}>
                Last 5 unique visitors • Total: {visitors.length}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {visitors.length > 0 ? (
                  visitors.map((visitor, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            fontSize: '24px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            lineHeight: '1',
                            textRendering: 'optimizeLegibility'
                          }}>
                            <span style={{ 
                              fontSize: '20px',
                              display: 'inline-block',
                              transform: 'scale(1.2)'
                            }}>
                              {getCountryFlag(visitor.country)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div style={{
                            fontWeight: '500',
                            color: '#111827',
                            fontSize: '14px'
                          }}>
                            {visitor.ip_address || 'Unknown'}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#6b7280'
                          }}>
                            {visitor.country || 'Unknown'} • {visitor.language || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#6b7280',
                        backgroundColor: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <Clock style={{ width: '16px', height: '16px' }} />
                        {formatDate(visitor.last_visit)}
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