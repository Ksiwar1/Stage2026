'use client';

import React, { useState } from 'react';
import { loginAction } from '../actions/auth';
import styles from '../page.module.css';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const response = await loginAction(formData);
      if (response && !response.success) {
        setError(response.error || 'Une erreur est survenue.');
        setIsLoading(false);
      }
      // Si succès, l'action gère la redirection
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      setIsLoading(false);
    }
  };

  return (
    <main className={`${styles.main} ${styles.heroImageBg}`} style={{ justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div 
        style={{
          width: '100%',
          maxWidth: '450px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(30px) saturate(160%)',
          WebkitBackdropFilter: 'blur(30px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          animation: 'fadeIn 0.8s ease-out',
          textAlign: 'left'
        }}
      >
        {/* En-tête de la carte */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div 
            style={{ 
              fontSize: '2.5rem', 
              marginBottom: '1rem',
              filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.4))'
            }}
          >
            🖥️
          </div>
          <h1 
            style={{ 
              fontSize: '1.8rem', 
              fontWeight: 800, 
              color: 'var(--foreground)',
              letterSpacing: '-0.03em',
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
            id="login-title"
          >
            Softavera Bornes
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>
            Connectez-vous pour configurer et éditer vos cartes de restaurants.
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div 
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              color: '#fca5a5', 
              padding: '1rem', 
              borderRadius: '12px', 
              fontSize: '0.9rem', 
              marginBottom: '1.5rem',
              animation: 'slideUp 0.3s ease-out'
            }}
            id="login-error"
          >
            ⚠️ {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label 
              htmlFor="email" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: '0.85rem', 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Adresse e-mail
            </label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              placeholder="votre.nom@softavera.fr"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: 'var(--foreground)',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label 
                htmlFor="password" 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Mot de passe
              </label>
            </div>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              placeholder="••••••••••••"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: 'var(--foreground)',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            id="login-submit-btn"
            style={{
              width: '100%',
              padding: '1.1rem',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginTop: '1rem',
              boxShadow: '0 0 15px var(--primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 25px var(--primary-glow)';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 15px var(--primary-glow)';
              }
            }}
          >
            {isLoading ? (
              <>
                <span 
                  style={{
                    display: 'inline-block',
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                Connexion en cours...
              </>
            ) : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
