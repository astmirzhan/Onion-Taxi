import { useState, useEffect } from 'react';
import { Contract, formatEther, parseEther } from 'ethers';
import CampaignABI from '../../../artifacts/contracts/Capmaign.sol/Campaign.json';

export default function CampaignDetails({ campaignAddress, provider, signer }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [donateAmount, setDonateAmount] = useState('');
    const [userContribution, setUserContribution] = useState(0n);

    useEffect(() => {
        if (campaignAddress && provider) {
            loadSummary();
        }
    }, [campaignAddress, provider]);

    const loadSummary = async () => {
        setLoading(true);
        setError('');

        try {
            const campaign = new Contract(campaignAddress, CampaignABI.abi, provider);
            const data = await campaign.getSummary();

            setSummary({
                creator: data._creator,
                title: data._title,
                goalWei: data._goalWei,
                deadline: data._deadline,
                totalRaised: data._totalRaised,
                finalized: data._finalized,
                successful: data._successful,
                contractBalance: data._contractBalance
            });

            if (signer) {
                const address = await signer.getAddress();
                const contribution = await campaign.contributions(address);
                setUserContribution(contribution);
            }
        } catch (err) {
            console.error('Load summary error:', err);
            setError('Load error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const extractErrorReason = (err) => {
        if (err.reason) return err.reason;
        if (err.data?.message) return err.data.message;
        if (err.error?.message) return err.error.message;
        if (err.message) {
            const match = err.message.match(/reason="([^"]+)"/);
            if (match) return match[1];
            const customMatch = err.message.match(/reverted with custom error '(\w+)\(\)'/);
            if (customMatch) return customMatch[1];
            return err.message.slice(0, 150);
        }
        return 'Unknown error';
    };

    const handleContribute = async () => {
        if (!signer || !donateAmount) return;

        setActionLoading('contribute');
        setError('');
        setSuccess('');

        try {
            const campaign = new Contract(campaignAddress, CampaignABI.abi, signer);
            const tx = await campaign.contribute({ value: parseEther(donateAmount) });
            setSuccess('Transaction sent...');
            await tx.wait();
            setSuccess('✅ Contribution successful!');
            setDonateAmount('');
            loadSummary();
        } catch (err) {
            console.error('Contribute error:', err);
            setError(`Error: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleCancel = async () => {
        if (!signer) return;

        setActionLoading('cancel');
        setError('');
        setSuccess('');

        try {
            const campaign = new Contract(campaignAddress, CampaignABI.abi, signer);
            const tx = await campaign.cancelContribution();
            setSuccess('Transaction sent...');
            await tx.wait();
            setSuccess('✅ Contribution cancelled, funds refunded!');
            loadSummary();
        } catch (err) {
            console.error('Cancel error:', err);
            setError(`Error: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleRefund = async () => {
        if (!signer) return;

        setActionLoading('refund');
        setError('');
        setSuccess('');

        try {
            const campaign = new Contract(campaignAddress, CampaignABI.abi, signer);
            const tx = await campaign.refund();
            setSuccess('Transaction sent...');
            await tx.wait();
            setSuccess('✅ Refund successful!');
            loadSummary();
        } catch (err) {
            console.error('Refund error:', err);
            setError(`Error: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleWithdraw = async () => {
        if (!signer) return;

        setActionLoading('withdraw');
        setError('');
        setSuccess('');

        try {
            const campaign = new Contract(campaignAddress, CampaignABI.abi, signer);
            const tx = await campaign.withdrawCreator();
            setSuccess('Transaction sent...');
            await tx.wait();
            setSuccess('✅ Funds withdrawn!');
            loadSummary();
        } catch (err) {
            console.error('Withdraw error:', err);
            setError(`Error: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(Number(timestamp) * 1000);
        return date.toLocaleString('en-US');
    };

    const isDeadlinePassed = () => {
        if (!summary) return false;
        return Date.now() / 1000 >= Number(summary.deadline);
    };

    if (!campaignAddress) {
        return (
            <div className="card">
                <h3 className="card-title">📊 Campaign Details</h3>
                <div className="empty-state">
                    <p>Select a campaign from the list</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="card">
                <h3 className="card-title">📊 Campaign Details</h3>
                <div className="loading">
                    <span className="spinner"></span>
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title">📊 {summary?.title || 'Campaign Details'}</h3>

            <div style={{ marginBottom: '12px', fontFamily: 'monospace', fontSize: '0.875rem', color: '#6B6B6B' }}>
                📍 {campaignAddress}
            </div>

            {summary && (
                <>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <div className="detail-label">Goal</div>
                            <div className="detail-value">{formatEther(summary.goalWei)} ETH</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Raised</div>
                            <div className="detail-value" style={{ color: 'var(--success)' }}>
                                {formatEther(summary.totalRaised)} ETH
                            </div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Баланс контракта</div>
                            <div className="detail-value">{formatEther(summary.contractBalance)} ETH</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Deadline</div>
                            <div className="detail-value">{formatDate(summary.deadline)}</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Status</div>
                            <div className="detail-value">
                                {summary.finalized ? (
                                    summary.successful ? <span style={{ color: 'var(--success)' }}>SUCCESS</span> : <span style={{ color: 'var(--error)' }}>FAILED</span>
                                ) : (
                                    isDeadlinePassed() ? <span style={{ color: 'var(--warning)' }}>ENDED</span> : <span style={{ color: 'var(--accent-cyan)' }}>ACTIVE</span>
                                )}
                            </div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Создатель</div>
                            <div className="detail-value" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                {summary.creator.slice(0, 10)}...
                            </div>
                        </div>
                    </div>

                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: `${Math.min((Number(summary.totalRaised) / Number(summary.goalWei)) * 100, 100)}%`
                            }}
                        ></div>
                    </div>

                    {/* Actions */}
                    <div className="action-buttons">
                        {!isDeadlinePassed() && !summary.finalized && (
                            <div className="contribute-form">
                                <div className="detail-label" style={{ marginBottom: '8px' }}>Make a Contribution</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.1"
                                        value={donateAmount}
                                        onChange={(e) => setDonateAmount(e.target.value)}
                                        disabled={actionLoading}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleContribute}
                                        disabled={actionLoading || !donateAmount}
                                    >
                                        {actionLoading === 'contribute' ? <span className="spinner"></span> : 'CONTRIBUTE'}
                                    </button>
                                </div>

                                {userContribution > 0n && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#6B6B6B', marginBottom: '8px' }}>
                                            You contributed {formatEther(userContribution)} ETH
                                        </div>
                                        <button
                                            className="btn btn-secondary btn-small"
                                            onClick={handleCancel}
                                            disabled={actionLoading}
                                            style={{ width: '100%', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                                        >
                                            {actionLoading === 'cancel' ? <span className="spinner"></span> : 'CANCEL & REFUND'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isDeadlinePassed() && !summary.successful && (
                            <div className="refund-section">
                                <p style={{ color: 'var(--error)', marginBottom: '8px', fontSize: '0.875rem' }}>
                                    Campaign failed. You can refund your contribution.
                                </p>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleRefund}
                                    disabled={actionLoading}
                                >
                                    {actionLoading === 'refund' ? <span className="spinner"></span> : 'GET REFUND'}
                                </button>
                            </div>
                        )}

                        {summary.successful && (
                            <div className="success-section">
                                <p style={{ color: 'var(--success)', marginBottom: '8px', fontSize: '0.875rem' }}>
                                    Campaign successful! Total raised: {formatEther(summary.totalRaised)} ETH
                                </p>
                                {/* Only creator can withdraw */}
                                <button
                                    className="btn btn-success"
                                    onClick={handleWithdraw}
                                    disabled={actionLoading}
                                >
                                    {actionLoading === 'withdraw' ? <span className="spinner"></span> : 'WITHDRAW FUNDS (Creator Only)'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {error && <div className="message message-error">{error}</div>}
            {success && <div className="message message-success">{success}</div>}

            <button
                className="btn btn-secondary btn-small"
                onClick={loadSummary}
                style={{ marginTop: '16px' }}
                disabled={loading}
            >
                🔄 Обновить
            </button>
        </div>
    );
}
