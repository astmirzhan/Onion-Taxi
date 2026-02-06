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
            setError('Connect wallet first!');
            return;
        }

        if (!title || !goalEth || !durationDays) {
            setError('Fill in all fields!');
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

            setSuccess('Transaction sent, waiting for confirmation...');

            const receipt = await tx.wait();

            let campaignAddress = null;

            for (const log of receipt.logs) {
                try {
                    const parsed = factory.interface.parseLog(log);
                    if (parsed && parsed.name === 'CampaignCreated') {
                        campaignAddress = parsed.args[1] || parsed.args.campaignAddress;
                        break;
                    }
                } catch {
                    continue;
                }
            }

            if (campaignAddress) {
                const shortAddr = `${campaignAddress.slice(0, 8)}...${campaignAddress.slice(-6)}`;
                setSuccess(`✅ Campaign created! Address: ${shortAddr}`);
            } else {
                setSuccess('✅ Campaign created successfully!');
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
            setError(`Error: ${reason}`);
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
        return 'Unknown error';
    };

    // Helper to display duration nicely
    const formatDurationHint = (days) => {
        if (!days || days <= 0) return '';
        const d = parseInt(days);
        if (d < 30) return `${d} days`;
        if (d < 365) {
            const months = Math.floor(d / 30);
            const remainDays = d % 30;
            return remainDays > 0 ? `≈ ${months} months ${remainDays} days` : `≈ ${months} months`;
        }
        const years = Math.floor(d / 365);
        const remainMonths = Math.floor((d % 365) / 30);
        return remainMonths > 0 ? `≈ ${years} years ${remainMonths} months` : `≈ ${years} years`;
    };

    return (
        <div className="card">
            <h3 className="card-title">📝 Create Campaign</h3>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Campaign Title</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. New Electric Taxi Fleet"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Goal (ETH)</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="1"
                            min="0.1"
                            step="0.1"
                            value={goalEth}
                            onChange={(e) => setGoalEth(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Duration (days)</label>
                        <input
                            type="number"
                            className="form-control"
                            placeholder="30"
                            min="1"
                            step="1"
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                            disabled={loading}
                        />
                        <small className="form-text text-muted">
                            {formatDurationHint(durationDays)}
                        </small>
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading || !signer}
                >
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            Creating...
                        </>
                    ) : (
                        '🔥 Create Campaign'
                    )}
                </button>

                {error && <div className="message message-error">{error}</div>}
                {success && <div className="message message-success">{success}</div>}
            </form>
        </div>
    );
}
