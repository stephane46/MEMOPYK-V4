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

  const getCountryFlag = (country: string) => {
    // Map country names to flag SVG elements - actual flag images, not emojis
    const getFlagSvg = (countryCode: string) => {
      const flags: { [key: string]: React.ReactElement } = {
        'ES': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#C60B1E"/>
            <rect y="3.75" width="20" height="7.5" fill="#FFC400"/>
          </svg>
        ),
        'IT': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="6.67" height="15" fill="#009246"/>
            <rect x="6.67" width="6.67" height="15" fill="#FFFFFF"/>
            <rect x="13.33" width="6.67" height="15" fill="#CE2B37"/>
          </svg>
        ),
        'FR': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="6.67" height="15" fill="#002395"/>
            <rect x="6.67" width="6.67" height="15" fill="#FFFFFF"/>
            <rect x="13.33" width="6.67" height="15" fill="#ED2939"/>
          </svg>
        ),
        'GB': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#012169"/>
            <path d="M0 0l20 15M20 0L0 15" stroke="#FFFFFF" strokeWidth="2"/>
            <path d="M0 0l20 15M20 0L0 15" stroke="#C8102E" strokeWidth="1.2"/>
            <path d="M10 0v15M0 7.5h20" stroke="#FFFFFF" strokeWidth="3"/>
            <path d="M10 0v15M0 7.5h20" stroke="#C8102E" strokeWidth="1.8"/>
          </svg>
        ),
        'DE': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="5" fill="#000000"/>
            <rect y="5" width="20" height="5" fill="#DD0000"/>
            <rect y="10" width="20" height="5" fill="#FFCE00"/>
          </svg>
        ),
        'US': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#B22234"/>
            <rect y="1.15" width="20" height="1.15" fill="#FFFFFF"/>
            <rect y="3.46" width="20" height="1.15" fill="#FFFFFF"/>
            <rect y="5.77" width="20" height="1.15" fill="#FFFFFF"/>
            <rect y="8.08" width="20" height="1.15" fill="#FFFFFF"/>
            <rect y="10.38" width="20" height="1.15" fill="#FFFFFF"/>
            <rect y="12.69" width="20" height="1.15" fill="#FFFFFF"/>
            <rect width="8" height="8.08" fill="#3C3B6E"/>
          </svg>
        ),
        'CA': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="6.67" height="15" fill="#FF0000"/>
            <rect x="6.67" width="6.67" height="15" fill="#FFFFFF"/>
            <rect x="13.33" width="6.67" height="15" fill="#FF0000"/>
            <path d="M10 4l1 2h2l-1.5 1.5L12.5 10L10 8.5 7.5 10l1-2.5L7 6h2l1-2z" fill="#FF0000"/>
          </svg>
        ),
        'BR': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#009739"/>
            <path d="M10 2l8 5.5-8 5.5-8-5.5z" fill="#FEDD00"/>
            <circle cx="10" cy="7.5" r="3" fill="#012169"/>
          </svg>
        ),
        'AU': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#012169"/>
            <rect width="10" height="7.5" fill="#012169"/>
            <path d="M0 0l10 7.5M10 0L0 7.5" stroke="#FFFFFF" strokeWidth="1"/>
            <path d="M5 0v7.5M0 3.75h10" stroke="#FFFFFF" strokeWidth="1.5"/>
          </svg>
        ),
        'NL': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="5" fill="#AE1C28"/>
            <rect y="5" width="20" height="5" fill="#FFFFFF"/>
            <rect y="10" width="20" height="5" fill="#21468B"/>
          </svg>
        ),
        'BE': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="6.67" height="15" fill="#000000"/>
            <rect x="6.67" width="6.67" height="15" fill="#FFD700"/>
            <rect x="13.33" width="6.67" height="15" fill="#ED2939"/>
          </svg>
        ),
        'CH': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#FF0000"/>
            <rect x="8" y="4" width="4" height="7" fill="#FFFFFF"/>
            <rect x="6" y="6" width="8" height="3" fill="#FFFFFF"/>
          </svg>
        ),
        'AT': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="5" fill="#ED2939"/>
            <rect y="5" width="20" height="5" fill="#FFFFFF"/>
            <rect y="10" width="20" height="5" fill="#ED2939"/>
          </svg>
        ),
        'SE': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#006AA7"/>
            <rect x="6" y="0" width="2" height="15" fill="#FECC00"/>
            <rect x="0" y="6.5" width="20" height="2" fill="#FECC00"/>
          </svg>
        ),
        'NO': (
          <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="15" fill="#EF2B2D"/>
            <rect x="6" y="0" width="2" height="15" fill="#FFFFFF"/>
            <rect x="0" y="6.5" width="20" height="2" fill="#FFFFFF"/>
            <rect x="6.5" y="0" width="1" height="15" fill="#002868"/>
            <rect x="0" y="7" width="20" height="1" fill="#002868"/>
          </svg>
        )
      };
      return flags[countryCode];
    };

    // Map country names to country codes
    const countryToCode: { [key: string]: string } = {
      'Spain': 'ES',
      'Italy': 'IT', 
      'France': 'FR',
      'United Kingdom': 'GB',
      'UK': 'GB',
      'Germany': 'DE',
      'United States': 'US',
      'USA': 'US',
      'Canada': 'CA',
      'Brazil': 'BR',
      'Australia': 'AU',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Sweden': 'SE',
      'Norway': 'NO',
      // Two-letter codes
      'ES': 'ES',
      'IT': 'IT',
      'FR': 'FR',
      'GB': 'GB',
      'DE': 'DE',
      'US': 'US',
      'CA': 'CA',
      'BR': 'BR',
      'AU': 'AU',
      'NL': 'NL',
      'BE': 'BE',
      'CH': 'CH',
      'AT': 'AT',
      'SE': 'SE',
      'NO': 'NO'
    };
    
    // Only show globe icon for truly unknown entries
    if (country === 'Unknown' || !country) {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#6B7280" strokeWidth="2"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#6B7280" strokeWidth="2"/>
        </svg>
      );
    }
    
    // Get the flag SVG for the country
    const countryCode = countryToCode[country];
    if (countryCode) {
      return getFlagSvg(countryCode);
    }
    
    // Default flag icon for unrecognized countries
    return (
      <svg width="20" height="15" viewBox="0 0 20 15" xmlns="http://www.w3.org/2000/svg">
        <rect width="20" height="15" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="1"/>
        <text x="10" y="9" textAnchor="middle" fontSize="8" fill="#6B7280">?</text>
      </svg>
    );
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
{getCountryFlag(visitor.country)}
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