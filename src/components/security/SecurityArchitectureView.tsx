import React, { useState } from 'react';
import {
  Shield,
  FileCode,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Play,
  Server,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_DEFINITIONS } from '../../types/auth';
import { useToast } from '../../context/ToastContext';

export const SecurityArchitectureView: React.FC = () => {
  const { role, permissions } = useAuth();
  const { showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState<'rules' | 'functions' | 'simulator'>('simulator');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Simulator State
  const [simCollection, setSimCollection] = useState<'users' | 'campaigns' | 'crash_issues' | 'admins' | 'financials'>('users');
  const [simOperation, setSimOperation] = useState<'read' | 'write' | 'update' | 'delete'>('read');
  const [simResult, setSimResult] = useState<{ allowed: boolean; ruleMatched: string; reason: string } | null>(null);

  const currentRoleDef = role !== 'unauthorized' ? ROLE_DEFINITIONS[role] : null;

  const handleRunSimulation = () => {
    let allowed = false;
    let ruleMatched = '';
    let reason = '';

    if (simCollection === 'users') {
      if (simOperation === 'read') {
        allowed = role === 'super_admin' || role === 'app_manager';
        ruleMatched = "allow read: if isSuperAdmin() || isAppManager()";
        reason = allowed ? 'Granted by isAppManager() / isSuperAdmin() condition.' : 'Marketing Admin is explicitly forbidden from reading user records.';
      } else if (simOperation === 'update') {
        allowed = role === 'super_admin' || (role === 'app_manager' && permissions.includes('users:edit'));
        ruleMatched = "allow update: if isSuperAdmin() || (isAppManager() && hasPermission('users:edit'))";
        reason = allowed ? 'Granted: Admin has valid users:edit permission claim.' : 'Denied: Role does not possess users:edit claim.';
      } else if (simOperation === 'delete') {
        allowed = role === 'super_admin';
        ruleMatched = "allow delete: if isSuperAdmin()";
        reason = allowed ? 'Granted: Super Admin root privileges.' : 'Denied: Deletion is restricted to Super Admin.';
      }
    } else if (simCollection === 'campaigns') {
      if (simOperation === 'read' || simOperation === 'write') {
        allowed = role === 'super_admin' || role === 'marketing_admin';
        ruleMatched = "allow read, write: if isSuperAdmin() || isMarketingAdmin()";
        reason = allowed ? 'Granted: Marketing Admin or Super Admin authorized.' : 'Denied: App Manager is restricted from marketing broadcast campaigns.';
      }
    } else if (simCollection === 'crash_issues') {
      allowed = role === 'super_admin' || role === 'app_manager';
      ruleMatched = "allow read, update: if isSuperAdmin() || isAppManager()";
      reason = allowed ? 'Granted: Operational diagnostics access.' : 'Denied: Marketing Admin does not hold Crashlytics clearance.';
    } else if (simCollection === 'admins') {
      allowed = role === 'super_admin';
      ruleMatched = "allow write: if isSuperAdmin()";
      reason = allowed ? 'Granted: Super Admin root governance.' : 'Denied: Modifying admin claims requires Super Admin role.';
    } else if (simCollection === 'financials') {
      allowed = role === 'super_admin';
      ruleMatched = "allow read, write: if isSuperAdmin()";
      reason = allowed ? 'Granted: Financial revenue clearance.' : 'Denied: Confidential financial data accessible only to Super Admin.';
    }

    setSimResult({ allowed, ruleMatched, reason });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showSuccess('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const firestoreRulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function getRole() {
      return request.auth.token.role;
    }

    function isSuperAdmin() {
      return isAuthenticated() && (getRole() == 'super_admin' || request.auth.token.admin == true);
    }

    function isAppManager() {
      return isAuthenticated() && (getRole() == 'app_manager' || isSuperAdmin());
    }

    function isMarketingAdmin() {
      return isAuthenticated() && (getRole() == 'marketing_admin' || isSuperAdmin());
    }

    function hasPermission(perm) {
      return isSuperAdmin() || (
        isAuthenticated() && 
        request.auth.token.permissions != null && 
        perm in request.auth.token.permissions
      );
    }

    // 1. User Directory & Profiles
    match /users/{userId} {
      allow read: if isSuperAdmin() || isAppManager() || (isAuthenticated() && request.auth.uid == userId);
      allow update: if isSuperAdmin() || (isAppManager() && hasPermission('users:edit'));
      allow delete: if isSuperAdmin();
    }

    // 2. FCM Push Campaigns (Marketing Admin)
    match /campaigns/{campaignId} {
      allow read: if isSuperAdmin() || isMarketingAdmin();
      allow create, update: if isSuperAdmin() || (isMarketingAdmin() && hasPermission('fcm:compose'));
    }

    // 3. Crashlytics & Error Traces (App Manager)
    match /crash_issues/{issueId} {
      allow read: if isSuperAdmin() || isAppManager();
      allow update: if isSuperAdmin() || (isAppManager() && hasPermission('crashlytics:manage_issues'));
    }

    // 4. Admin Management (Super Admin Root)
    match /admins/{adminId} {
      allow read: if isSuperAdmin() || (isAuthenticated() && request.auth.uid == adminId);
      allow write: if isSuperAdmin();
    }
  }
}`;

  const cloudFunctionSnippet = `const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Cloud Function: Set Custom Claims & Role
 * Enforces Super Admin verification before assigning claims
 */
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  // Verify caller holds Super Admin role in their token custom claims
  if (context.auth.token.role !== 'super_admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Administrators can set administrative custom claims.'
    );
  }

  const { targetUid, newRole, customPermissions, department } = data;

  // Set Firebase Auth custom claims directly on user identity token
  await admin.auth().setCustomUserClaims(targetUid, {
    role: newRole,
    permissions: customPermissions,
    department: department || 'Staff',
    updated_at: new Date().toISOString(),
  });

  return { success: true, message: 'Custom claims assigned successfully' };
});`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Security Architecture & Rules Engine</h1>
            <span className="badge badge-success">Defense-in-Depth</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Inspect Firestore Security Rules, backend Cloud Functions token verification, and test permission evaluations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${activeTab === 'simulator' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('simulator')}
          >
            <Play size={14} /> Rule Simulator
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('rules')}
          >
            <FileCode size={14} /> firestore.rules
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'functions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('functions')}
          >
            <Server size={14} /> Cloud Functions
          </button>
        </div>
      </div>

      {activeTab === 'simulator' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Shield size={18} />
              <span>Real-Time Firestore Security Rule Evaluator</span>
            </div>
            <span className="badge badge-neutral">Active Context: {currentRoleDef?.displayName || role}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Target Firestore Collection</label>
              <select
                className="form-select"
                value={simCollection}
                onChange={(e) => setSimCollection(e.target.value as any)}
              >
                <option value="users">/users/{'{userId}'} (User Profiles)</option>
                <option value="campaigns">/campaigns/{'{id}'} (FCM Broadcasts)</option>
                <option value="crash_issues">/crash_issues/{'{id}'} (Crashlytics)</option>
                <option value="admins">/admins/{'{adminId}'} (RBAC Roles)</option>
                <option value="financials">/financials/{'{id}'} (MRR & Revenue)</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Request Operation</label>
              <select
                className="form-select"
                value={simOperation}
                onChange={(e) => setSimOperation(e.target.value as any)}
              >
                <option value="read">READ (get / list)</option>
                <option value="write">CREATE (set / add)</option>
                <option value="update">UPDATE (modify fields)</option>
                <option value="delete">DELETE (remove document)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleRunSimulation} style={{ width: '100%' }}>
                <Play size={16} /> Evaluate Rule
              </button>
            </div>
          </div>

          {simResult && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-sm)',
                background: simResult.allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${simResult.allowed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {simResult.allowed ? (
                  <>
                    <CheckCircle size={20} style={{ color: 'var(--status-success)' }} />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--status-success)' }}>
                      200 OK — ACCESS GRANTED
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} style={{ color: 'var(--status-danger)' }} />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--status-danger)' }}>
                      PERMISSION_DENIED — 403 FORBIDDEN
                    </span>
                  </>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '6px' }}>
                {simResult.reason}
              </div>

              <div style={{ marginTop: '10px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                Rule Match: <code>{simResult.ruleMatched}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FileCode size={18} />
              <span>firestore.rules (Production Definition)</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(firestoreRulesSnippet, 'rules')}>
              {copiedCode === 'rules' ? <Check size={14} /> : <Copy size={14} />} {copiedCode === 'rules' ? 'Copied' : 'Copy Rules'}
            </button>
          </div>
          <pre className="code-block" style={{ fontSize: '0.8rem', maxHeight: '500px' }}>
            {firestoreRulesSnippet}
          </pre>
        </div>
      )}

      {activeTab === 'functions' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Server size={18} />
              <span>functions/index.js (Firebase Admin SDK Custom Claims Backend)</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(cloudFunctionSnippet, 'functions')}>
              {copiedCode === 'functions' ? <Check size={14} /> : <Copy size={14} />} {copiedCode === 'functions' ? 'Copied' : 'Copy Function'}
            </button>
          </div>
          <pre className="code-block" style={{ fontSize: '0.8rem', maxHeight: '500px' }}>
            {cloudFunctionSnippet}
          </pre>
        </div>
      )}
    </div>
  );
};
