export function getInvitationStatus(invitation) {
  if (!invitation) {
    return {
      label: 'Missing',
      className: 'bg-slate-200 text-slate-600',
      description: 'No invitation record'
    };
  }

  if (invitation.checkedInAt || invitation.status === 'checked-in') {
    return {
      label: 'Checked-in',
      className: 'bg-moss text-white',
      description: formatDateTime(invitation.checkedInAt)
    };
  }

  if (invitation.status === 'sent') {
    return {
      label: 'Ready',
      className: 'bg-champagne text-ink',
      description: invitation.sentAt ? `Active ${formatDateTime(invitation.sentAt)}` : 'Invitation active'
    };
  }

  if (invitation.status === 'failed') {
    return {
      label: 'Failed',
      className: 'bg-red-100 text-red-700',
      description: invitation.emailError || 'Needs attention'
    };
  }

  return {
    label: 'Pending',
    className: 'bg-clay/10 text-clay',
    description: 'Waiting to be sent or scanned'
  };
}

export function formatDateTime(value) {
  if (!value) return 'Not checked in yet';

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}
