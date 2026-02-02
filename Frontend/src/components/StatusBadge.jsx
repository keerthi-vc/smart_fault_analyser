import React from 'react';

const StatusBadge = ({ status, priority }) => {
    if (status) {
        const statusConfig = {
            pending: { color: 'warning', text: 'Pending' },
            analyzing: { color: 'info', text: 'Analyzing' },
            resolved: { color: 'success', text: 'Resolved' },
            closed: { color: 'primary', text: 'Closed' }
        };

        const config = statusConfig[status] || statusConfig.pending;
        return <span className={`badge badge-${config.color}`}>{config.text}</span>;
    }

    if (priority) {
        const priorityConfig = {
            low: { color: 'info', text: 'Low' },
            medium: { color: 'warning', text: 'Medium' },
            high: { color: 'error', text: 'High' },
            critical: { color: 'error', text: 'Critical' }
        };

        const config = priorityConfig[priority] || priorityConfig.medium;
        return <span className={`badge badge-${config.color}`}>{config.text}</span>;
    }

    return null;
};

export default StatusBadge;
