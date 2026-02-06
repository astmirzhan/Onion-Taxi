import { useState } from 'react';
import { Contract, parseEther } from 'ethers';
import { FACTORY_ADDRESS } from '../config.js';
import CampaignFactoryABI from '../../../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json';

export default function CreateCampaignForm({ signer, onCampaignCreated }) {
    const [title, setTitle] = useState('');
    const [goalEth, setGoalEth] = useState('');
    const [durationDays, setDurationDays] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!signer) {
            setError('Сначала подключите кошелёк!');
            return;
        }

        if (!title || !goalEth || !durationDays) {
            setError('Заполните все поля!');
            return;
        }

        // Convert days to seconds
        const durationSeconds = parseInt(durationDays) * 24 * 60 * 60;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const factory = new Contract(FACTORY_ADDRESS, CampaignFactoryABI.abi, signer);

            const tx = await factory.createCampaign(
                title,
                parseEther(goalEth), // Convert ETH to Wei
                durationSeconds
            );

            setSuccess('Транзакция отправлена, ожидаем подтверждения...');

            const receipt = await tx.wait();

            // Find the CampaignCreated event
            const event = receipt.logs.find(log => {
                try {
                    const parsed = factory.interface.parseLog(log);
                    return parsed?.name === 'CampaignCreated';
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsed = factory.interface.parseLog(event);
                setSuccess(`✅ Кампания создана! Адрес: ${parsed.args.campaignAddress}`);
            } else {
                setSuccess('✅ Кампания успешно создана!');
            }

            // Clear form
            setTitle('');
            setGoalEth('');
            setDurationDays('');

            if (onCampaignCreated) {
                onCampaignCreated();
            }
        } catch (err) {
            console.error('Create campaign error:', err);
            const reason = extractErrorReason(err);
            setError(`Ошибка: ${reason}`);
        } finally {
            setLoading(false);
        }
    };

    const extractErrorReason = (err) => {
        if (err.reason) return err.reason;
        if (err.data?.message) return err.data.message;
        if (err.error?.message) return err.error.message;
        if (err.message) {
            // Try to extract revert reason from message
            const match = err.message.match(/reason="([^"]+)"/);
            if (match) return match[1];
            return err.message.slice(0, 100);
        }
        return 'Неизвестная ошибка';
    };

    // Helper to display duration nicely
    const formatDurationHint = (days) => {
        if (!days || days <= 0) return '';
        const d = parseInt(days);
        if (d < 30) return `${d} дн.`;
        if (d < 365) {
            const months = Math.floor(d / 30);
            const remainDays = d % 30;
            return remainDays > 0 ? `≈ ${months} мес. ${remainDays} дн.` : `≈ ${months} мес.`;
        }
        const years = Math.floor(d / 365);
        const remainMonths = Math.floor((d % 365) / 30);
        return remainMonths > 0 ? `≈ ${years} г. ${remainMonths} мес.` : `≈ ${years} г.`;
    };

    return (
        <div className="card">
            <h3 className="card-title">📝 Создать кампанию</h3>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Название кампании</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Например: Новое такси для города"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Цель (ETH)</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="1"
                            min="1"
                            step="1"
                            value={goalEth}
                            onChange={(e) => setGoalEth(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Длительность (дни)</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="30"
                            min="1"
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                            disabled={loading}
                        />
                        {durationDays && (
                            <span className="duration-hint">{formatDurationHint(durationDays)}</span>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !signer}
                >
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            Создание...
                        </>
                    ) : (
                        '🚀 Создать кампанию'
                    )}
                </button>
            </form>

            {error && <div className="message message-error">{error}</div>}
            {success && <div className="message message-success">{success}</div>}
        </div>
    );
}
