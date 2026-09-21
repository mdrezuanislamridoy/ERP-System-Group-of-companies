import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StateBlock } from '../components/ui/States';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader crumbs={[{ label: 'ABC GROUP', to: '/' }, { label: 'Not found' }]} title="Page not found" />
      <div className="p-6">
        <div className="rounded-lg border border-line bg-subtle">
          <StateBlock
            variant="error"
            title="This page does not exist"
            description="The record may have been moved, archived, or it belongs to a company outside your current context."
            secondary={{ label: 'Go back', onClick: () => navigate(-1) }}
            primary={{ label: 'Open dashboard', onClick: () => navigate('/') }} />
          
        </div>
      </div>
    </div>);

}