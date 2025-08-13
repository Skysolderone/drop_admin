import React from 'react';
import { Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface DeleteConfirmModalProps {
    visible: boolean;
    title?: string;
    content?: string;
    itemName?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    visible,
    title = '确认删除',
    content,
    itemName,
    onConfirm,
    onCancel,
    loading = false
}) => {
    if (!visible) return null;

    const defaultContent = itemName 
        ? `确定要删除 "${itemName}" 吗？此操作不可撤销。`
        : '确定要删除此项吗？此操作不可撤销。';

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    minWidth: '400px',
                    maxWidth: '500px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    animation: 'fadeIn 0.2s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <ExclamationCircleOutlined 
                        style={{ color: '#faad14', fontSize: '22px', marginRight: '8px' }} 
                    />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>{title}</h3>
                </div>
                
                <p style={{ margin: '0 0 24px 0', color: '#666', lineHeight: '1.5' }}>
                    {content || defaultContent}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Button onClick={onCancel} disabled={loading}>
                        取消
                    </Button>
                    <Button 
                        type="primary" 
                        danger 
                        onClick={onConfirm}
                        loading={loading}
                    >
                        确认删除
                    </Button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
        </div>
    );
};

export default DeleteConfirmModal;