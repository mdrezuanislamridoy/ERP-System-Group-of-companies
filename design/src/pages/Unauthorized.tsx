import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StateBlock } from '../components/ui/States';
import { useApp } from '../contexts/AppContext';

export function Unauthorized({ permission }: {permission?: string;}) {
  const navigate = useNavigate();
  const { role } = useApp();
  return (
    <div>
      <PageHeader crumbs={[{ label: 'ABC GROUP', to: '/' }, { label: 'Access denied' }]} title="You do not have access to this area" />
      <div className="p-6">
        <div className="rounded-lg border border-line bg-subtle">
          <StateBlock
            variant="denied"
            title="Permission required"
            description={`Your role (${role.label}) does not include ${permission ? `“${permission}”` : 'the required permission'}. Request access from your Group IT administrator, or switch to a context where you hold this permission.`}
            secondary={{ label: 'Go back', onClick: () => navigate(-1) }}
            primary={{ label: 'Request access', onClick: () => navigate('/profile') }} />
          
        </div>
      </div>
    </div>);

}