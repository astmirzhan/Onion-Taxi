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
        } catch (err) {
            console.error('Load summary error:', err);
            setError('Ошибка загрузки: ' + err.message);
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
            // Check for custom errors
            const customMatch = err.message.match(/reverted with custom error '(\w+)\(\)'/);
            if (customMatch) return customMatch[1];
            return err.message.slice(0, 150);
        }
        return 'Неизвестная ошибка';
    };

    const handleContribute = async () => {
        if (!signer || !donateAmount) return;

        setActionLoading('contribute');
        setError('');
        setSuccess('');

        try {
            const campaign = new Contract(campaignAddress, CampaignABI.abi, signer);
            const tx = await campaign.contribute({ value: parseEther(donateAmount) });
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Вклад успешно сделан!');
            setDonateAmount('');
            loadSummary();
        } catch (err) {
            console.error('Contribute error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const handleFinalize = async () => {
        if (!signer) return;

        setActionLoading('finalize');
        setError('');
        setSuccess('');

        try {
            const campaign = new Contract(campaignAddress, CampaignABI.abi, signer);
            const tx = await campaign.finalize();
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Кампания финализирована!');
            loadSummary();
        } catch (err) {
            console.error('Finalize error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
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
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Возврат средств выполнен!');
            loadSummary();
        } catch (err) {
            console.error('Refund error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
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
            setSuccess('Транзакция отправлена...');
            await tx.wait();
            setSuccess('✅ Средства выведены!');
            loadSummary();
        } catch (err) {
            console.error('Withdraw error:', err);
            setError(`Ошибка: ${extractErrorReason(err)}`);
        } finally {
            setActionLoading('');
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(Number(timestamp) * 1000);
        return date.toLocaleString('ru-RU');
    };

    const isDeadlinePassed = () => {
        if (!summary) return false;
        return Date.now() / 1000 >= Number(summary.deadline);
    };

    if (!campaignAddress) {
        return (
            <div className="card">
                <h3 className="card-title">📊 Детали кампании</h3>
                <div className="empty-state">
                    <p>Выберите кампанию из списка слева</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="card">
                <h3 className="card-title">📊 Детали кампании</h3>
                <div className="loading">
                    <span className="spinner"></span>
                    Загрузка...
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title">📊 {summary?.title || 'Детали кампании'}</h3>

            <div style={{ marginBottom: '12px', fontFamily: 'monospace', fontSize: '0.875rem', color: '#6B6B6B' }}>
                📍 {campaignAddress}
            </div>

            {summary && (
                <>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <div className="detail-label">Цель</div>
                            <div className="detail-value">{formatEther(summary.goalWei)} ETH</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Собрано</div>
                            <div className="detail-value">{formatEther(summary.totalRaised)} ETH</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Баланс контракта</div>
                            <div className="detail-value">{formatEther(summary.contractBalance)} ETH</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Дедлайн</div>
                            <div className="detail-value" style={{ fontSize: '0.875rem' }}>
                                {formatDate(summary.deadline)}
                            </div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Статус</div>
                            <div className={`detail-value ${summary.finalized ? (summary.successful ? 'success' : 'error') : ''}`}>
                                {summary.finalized
                                    ? (summary.successful ? '✅ Успешно' : '❌ Не достигнуто')
                                    : (isDeadlinePassed() ? '⏰ Ожидает финализации' : '🔄 Активна')}
                            </div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">Создатель</div>
                            <div className="detail-value" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                {summary.creator.slice(0, 10)}...
                            </div>
                        </div>
                    </div>

                    <div className="actions-grid">
                        {/* Contribute */}
                        <div className="action-card">
                            <h4>💰 Внести вклад</h4>
                            <div className="inline-form">
                                <div className="form-group">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="ETH"
                                        step="0.01"
                                        min="0.001"
                                        value={donateAmount}
                                        onChange={(e) => setDonateAmount(e.target.value)}
                                        disabled={actionLoading || summary.finalized}
                                    />
                                </div>
                                <button
                                    className="btn btn-primary btn-small"
                                    onClick={handleContribute}
                                    disabled={actionLoading || !signer || !donateAmount || summary.finalized}
                                >
                                    {actionLoading === 'contribute' ? <span className="spinner"></span> : 'Contribute'}
                                </button>
                            </div>
                        </div>

                        {/* Finalize */}
                        <div className="action-card">
                            <h4>🏁 Финализация</h4>
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={handleFinalize}
                                disabled={actionLoading || !signer || !isDeadlinePassed() || summary.finalized}
                            >
                                {actionLoading === 'finalize' ? <span className="spinner"></span> : 'Finalize'}
                            </button>
                            {!isDeadlinePassed() && <p style={{ fontSize: '0.75rem', marginTop: '8px', color: '#6B6B6B' }}>Доступно после дедлайна</p>}
                        </div>

                        {/* Refund */}
                        <div className="action-card">
                            <h4>↩️ Возврат средств</h4>
                            <button
                                className="btn btn-danger btn-small"
                                onClick={handleRefund}
                                disabled={actionLoading || !signer || !summary.finalized || summary.successful}
                            >
                                {actionLoading === 'refund' ? <span className="spinner"></span> : 'Refund'}
                            </button>
                            {(!summary.finalized || summary.successful) && (
                                <p style={{ fontSize: '0.75rem', marginTop: '8px', color: '#6B6B6B' }}>
                                    Доступно если кампания не успешна
                                </p>
                            )}
                        </div>

                        {/* Withdraw */}
                        <div className="action-card">
                            <h4>💸 Вывод (создатель)</h4>
                            <button
                                className="btn btn-success btn-small"
                                onClick={handleWithdraw}
                                disabled={actionLoading || !signer || !summary.finalized || !summary.successful}
                            >
                                {actionLoading === 'withdraw' ? <span className="spinner"></span> : 'Withdraw'}
                            </button>
                            {(!summary.finalized || !summary.successful) && (
                                <p style={{ fontSize: '0.75rem', marginTop: '8px', color: '#6B6B6B' }}>
                                    Доступно только создателю успешной кампании
                                </p>
                            )}
                        </div>
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
