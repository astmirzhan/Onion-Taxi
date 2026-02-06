import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { FACTORY_ADDRESS } from '../config.js';
import CampaignFactoryABI from '../../../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json';

export default function CampaignList({ provider, signer, selectedCampaign, onSelectCampaign }) {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (provider) {
            loadCampaigns();
        }
    }, [provider]);

    const loadCampaigns = async () => {
        if (!provider) {
            setError('Сначала подключите кошелёк!');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const factory = new Contract(FACTORY_ADDRESS, CampaignFactoryABI.abi, provider);
            const campaignAddresses = await factory.getCampaigns();
            setCampaigns(campaignAddresses);

            if (campaignAddresses.length === 0) {
                setError('Кампаний пока нет. Создайте первую!');
            }
        } catch (err) {
            console.error('Load campaigns error:', err);
            setError('Ошибка загрузки кампаний: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const truncateAddress = (address) => {
        return `${address.slice(0, 10)}...${address.slice(-8)}`;
    };

    return (
        <div className="card">
            <h3 className="card-title">📋 Список кампаний</h3>

            <button
                className="btn btn-secondary"
                onClick={loadCampaigns}
                disabled={loading || !provider}
                style={{ marginBottom: '16px' }}
            >
                {loading ? (
                    <>
                        <span className="spinner"></span>
                        Загрузка...
                    </>
                ) : (
                    '🔄 Загрузить кампании'
                )}
            </button>

            {error && <div className="message message-error">{error}</div>}

            {campaigns.length > 0 && (
                <ul className="campaign-list">
                    {campaigns.map((address, index) => (
                        <li
                            key={address}
                            className={`campaign-item ${selectedCampaign === address ? 'selected' : ''}`}
                            onClick={() => onSelectCampaign(address)}
                        >
                            <strong>Кампания #{index + 1}</strong>
                            <div className="campaign-item-address">{truncateAddress(address)}</div>
                        </li>
                    ))}
                </ul>
            )}

            {campaigns.length === 0 && !loading && !error && (
                <div className="empty-state">
                    <p>Нажмите кнопку выше чтобы загрузить список кампаний</p>
                </div>
            )}
        </div>
    );
}
