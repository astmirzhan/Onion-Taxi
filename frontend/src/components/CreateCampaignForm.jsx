import { useState } from 'react';
import { Contract, parseEther } from 'ethers';
import { FACTORY_ADDRESS } from '../config.js';
import CampaignFactoryABI from '../../../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json';

export default function CreateCampaignForm({ signer, onCampaignCreated }) {
    const [title, setTitle] = useState('');
    const [goalEth, setGoalEth] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!signer) {
            setError('Сначала подключите кошелёк!');
            return;
        }

        if (!title || !goalEth || !durationMinutes) {
            setError('Заполните все поля!');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const factory = new Contract(FACTORY_ADDRESS, CampaignFactoryABI.abi, signer);

            const tx = await factory.createCampaign(
                title,
                goalEth, // contract expects ETH amount as integer (converted to wei internally)
                durationMinutes
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
            setDurationMinutes('');

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
                        <label>Длительность (минуты)</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="60"
                            min="1"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                            disabled={loading}
                        />
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
