import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { FACTORY_ADDRESS } from '../config.js';
import CampaignFactoryABI from '../../../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json';

export default function CampaignList({ provider, signer, selectedCampaign, onSelectCampaign }) {
    const [campaigns, setCampaigns] = useState([]);
    const [campaignNames, setCampaignNames] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (provider) {
            loadCampaigns();
        }
    }, [provider]);

    const loadCampaigns = async () => {
        if (!provider) {
            setError('Please connect your wallet first!');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const factory = new Contract(FACTORY_ADDRESS, CampaignFactoryABI.abi, provider);
            const campaignAddresses = await factory.getCampaigns();
            setCampaigns(campaignAddresses);

            // Load campaign names
            const names = {};
            for (const address of campaignAddresses) {
                try {
                    const campaignABI = [
                        {
                            "inputs": [],
                            "name": "title",
                            "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
                            "stateMutability": "view",
                            "type": "function"
                        }
                    ];
                    const campaign = new Contract(address, campaignABI, provider);
                    const title = await campaign.title();
                    names[address] = title;
                } catch (err) {
                    console.error(`Error loading title for campaign ${address}:`, err);
                    names[address] = `Campaign ${Object.keys(names).length + 1}`;
                }
            }
            setCampaignNames(names);

            if (campaignAddresses.length === 0) {
                setError('No campaigns found. Create the first one!');
            }
        } catch (err) {
            console.error('Load campaigns error:', err);
            setError('Error loading campaigns: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const truncateAddress = (address) => {
        return `${address.slice(0, 10)}...${address.slice(-8)}`;
    };

    return (
        <div className="card">
            <h3 className="card-title">📋 Campaign List</h3>

            <button
                className="btn btn-secondary"
                onClick={loadCampaigns}
                disabled={loading || !provider}
                style={{ marginBottom: '16px' }}
            >
                {loading ? (
                    <>
                        <span className="spinner"></span>
                        Loading...
                    </>
                ) : (
                    '🔄 Load Campaigns'
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
                            <strong>{campaignNames[address] || `Campaign #${index + 1}`}</strong>
                            <div className="campaign-item-address">{truncateAddress(address)}</div>
                        </li>
                    ))}
                </ul>
            )}

            {campaigns.length === 0 && !loading && !error && (
                <div className="empty-state">
                    <p>Click the button above to load campaigns</p>
                </div>
            )}
        </div>
    );
}
