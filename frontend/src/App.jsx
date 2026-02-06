import { useState } from 'react';
import WalletBar from './components/WalletBar.jsx';
import CreateCampaignForm from './components/CreateCampaignForm.jsx';
import CampaignList from './components/CampaignList.jsx';
import CampaignDetails from './components/CampaignDetails.jsx';
import DaoPanel from './components/DaoPanel.jsx';

export default function App() {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [activeTab, setActiveTab] = useState('campaigns');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleCampaignCreated = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="app">
            <header className="app-header">
                <img src="/images/onion-taxi-logo.png" alt="Onion Taxi" className="header-logo" />
                <h1>🚕 Onion Taxi Crowdfunding</h1>
                <p>Децентрализованная платформа для краудфандинга</p>
            </header>

            <WalletBar
                account={account}
                setAccount={setAccount}
                provider={provider}
                setProvider={setProvider}
                signer={signer}
                setSigner={setSigner}
            />

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'campaigns' ? 'active' : ''}`}
                    onClick={() => setActiveTab('campaigns')}
                >
                    📋 Кампании
                </button>
                <button
                    className={`tab ${activeTab === 'dao' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dao')}
                >
                    🪙 Токены
                </button>
            </div>

            {activeTab === 'campaigns' && (
                <div className="main-grid">
                    <div className="sidebar">
                        <CreateCampaignForm
                            signer={signer}
                            onCampaignCreated={handleCampaignCreated}
                        />
                        <CampaignList
                            key={refreshKey}
                            provider={provider}
                            signer={signer}
                            selectedCampaign={selectedCampaign}
                            onSelectCampaign={setSelectedCampaign}
                        />
                    </div>
                    <div className="content">
                        <CampaignDetails
                            campaignAddress={selectedCampaign}
                            provider={provider}
                            signer={signer}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'dao' && (
                <DaoPanel
                    provider={provider}
                    signer={signer}
                    account={account}
                />
            )}
        </div>
    );
}
