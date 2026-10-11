import React from 'react';
import { UserRound, Stethoscope, ShieldCheck, ArrowRight, X, LockKeyhole, UserPlus } from 'lucide-react';

interface RoleSelectModalProps {
  isOpen: boolean;
  type: 'login' | 'signup';
  onClose: () => void;
  onSelect: (path: string) => void;
}

export function RoleSelectModal({ isOpen, type, onClose, onSelect }: RoleSelectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="role-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="role-modal-card" onClick={e => e.stopPropagation()}>
        <div className="role-modal-head">
          <div className="role-modal-title">
            <span className="role-modal-badge">
              {type === 'login' ? <LockKeyhole size={18} /> : <UserPlus size={18} />}
            </span>
            <div>
              <h3>{type === 'login' ? 'Select Portal to Sign In' : 'Choose Account Type'}</h3>
              <p>
                {type === 'login'
                  ? 'Access your role-specific MedQueue workspace'
                  : 'Get started with MedQueue today'}
              </p>
            </div>
          </div>
          <button className="role-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="role-options-list">
          {type === 'login' ? (
            <>
              <button
                className="role-option-card"
                onClick={() => {
                  onSelect('/login');
                  onClose();
                }}
              >
                <div className="role-icon-box patient">
                  <UserRound size={22} />
                </div>
                <div className="role-option-info">
                  <div className="role-option-name">
                    <span>Patient / User Login</span>
                    <span className="role-tag">Patient</span>
                  </div>
                  <p>Book appointments, view history, and manage healthcare requests.</p>
                </div>
                <ArrowRight size={18} className="role-arrow" />
              </button>

              <button
                className="role-option-card"
                onClick={() => {
                  onSelect('/doctor/login');
                  onClose();
                }}
              >
                <div className="role-icon-box doctor">
                  <Stethoscope size={22} />
                </div>
                <div className="role-option-info">
                  <div className="role-option-name">
                    <span>Doctor Portal Login</span>
                    <span className="role-tag provider">Doctor</span>
                  </div>
                  <p>Manage clinic schedule, patient appointments, and professional profile.</p>
                </div>
                <ArrowRight size={18} className="role-arrow" />
              </button>

              <button
                className="role-option-card admin-option"
                onClick={() => {
                  onSelect('/admin/login');
                  onClose();
                }}
              >
                <div className="role-icon-box admin">
                  <ShieldCheck size={22} />
                </div>
                <div className="role-option-info">
                  <div className="role-option-name">
                    <span>Administrator Console</span>
                    <span className="role-tag admin">Admin</span>
                  </div>
                  <p>Verify doctor credentials, manage users, hospitals, and platform audit logs.</p>
                </div>
                <ArrowRight size={18} className="role-arrow" />
              </button>
            </>
          ) : (
            <>
              <button
                className="role-option-card"
                onClick={() => {
                  onSelect('/signup');
                  onClose();
                }}
              >
                <div className="role-icon-box patient">
                  <UserRound size={22} />
                </div>
                <div className="role-option-info">
                  <div className="role-option-name">
                    <span>Create User Account</span>
                    <span className="role-tag">Patient</span>
                  </div>
                  <p>Create a personal account to search specialists and book appointments.</p>
                </div>
                <ArrowRight size={18} className="role-arrow" />
              </button>

              <button
                className="role-option-card"
                onClick={() => {
                  onSelect('/doctor/signup');
                  onClose();
                }}
              >
                <div className="role-icon-box doctor">
                  <Stethoscope size={22} />
                </div>
                <div className="role-option-info">
                  <div className="role-option-name">
                    <span>Register as a Doctor</span>
                    <span className="role-tag provider">Provider</span>
                  </div>
                  <p>Submit qualifications, license & clinic details for credential verification.</p>
                </div>
                <ArrowRight size={18} className="role-arrow" />
              </button>

              <div className="admin-signup-note">
                <ShieldCheck size={16} />
                <div>
                  <strong>Looking for Administrator Access?</strong>
                  <span>
                    Public administrator registration is prohibited for security. Admin accounts must be
                    provisioned by a system administrator.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
