import React from 'react';
import Page from 'components/Page';
import globalize from 'lib/globalize';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type ActionFunctionArgs, Form, useActionData, useNavigation } from 'react-router-dom';
import { getConfigurationApi } from '@jellyfin/sdk/lib/utils/api/configuration-api';
import { QUERY_KEY, useConfiguration } from 'hooks/useConfiguration';
import Loading from 'components/loading/LoadingComponent';
import { ActionData } from 'types/actionData';
import { queryClient } from 'utils/query/queryClient';
import type { ServerConfiguration } from '@jellyfin/sdk/lib/generated-client/models/server-configuration';

/**
 * Pre-packaged HLS server settings. These fields are added by the pre-packaged HLS server patch and
 * are not yet part of the generated SDK ServerConfiguration model, so they are accessed via this
 * augmenting type. The runtime configuration object does carry them.
 */
type PrePackagedHlsConfig = {
    EnablePrePackagedHls?: boolean;
    ForcePrePackagedHls?: boolean;
    EnablePrePackagedHlsTranscodeFallback?: boolean;
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const api = ServerConnections.getCurrentApi();
    if (!api) throw new Error('No Api instance available');

    const { data: config } = await getConfigurationApi(api).getConfiguration();
    const formData = await request.formData();

    const bitrateLimit = formData.get('StreamingBitrateLimit')?.toString();
    config.RemoteClientBitrateLimit = Math.trunc(1e6 * parseFloat(bitrateLimit || '0'));

    const hlsConfig = config as ServerConfiguration & PrePackagedHlsConfig;
    hlsConfig.EnablePrePackagedHls = formData.get('EnablePrePackagedHls') === 'on';
    hlsConfig.ForcePrePackagedHls = formData.get('ForcePrePackagedHls') === 'on';
    hlsConfig.EnablePrePackagedHlsTranscodeFallback = formData.get('EnablePrePackagedHlsTranscodeFallback') === 'on';

    await getConfigurationApi(api)
        .updateConfiguration({ serverConfiguration: config });

    void queryClient.invalidateQueries({
        queryKey: [ QUERY_KEY ]
    });

    return {
        isSaved: true
    };
};

export const Component = () => {
    const navigation = useNavigation();
    const actionData = useActionData() as ActionData | undefined;
    const isSubmitting = navigation.state === 'submitting';

    const { isPending: isConfigurationPending, data: defaultConfiguration } = useConfiguration();

    if (isConfigurationPending) {
        return <Loading />;
    }

    const hlsConfig = defaultConfiguration as (ServerConfiguration & PrePackagedHlsConfig) | undefined;

    return (
        <Page
            id='streamingSettingsPage'
            title={globalize.translate('TabStreaming')}
            className='mainAnimatedPage type-interior'
        >
            <Box className='content-primary'>
                <Form method='POST'>
                    <Stack spacing={3}>
                        <Typography variant='h1'>
                            {globalize.translate('TabStreaming')}
                        </Typography>

                        {!isSubmitting && actionData?.isSaved && (
                            <Alert severity='success'>
                                {globalize.translate('SettingsSaved')}
                            </Alert>
                        )}

                        <TextField
                            type='number'
                            inputMode='decimal'
                            name='StreamingBitrateLimit'
                            label={globalize.translate('LabelRemoteClientBitrateLimit')}
                            helperText={globalize.translate('LabelRemoteClientBitrateLimitHelp')}
                            defaultValue={defaultConfiguration?.RemoteClientBitrateLimit ? defaultConfiguration?.RemoteClientBitrateLimit / 1e6 : ''}
                            slotProps={{
                                htmlInput: {
                                    min: 0,
                                    step: 0.25
                                }
                            }}
                        />

                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name='EnablePrePackagedHls'
                                        defaultChecked={hlsConfig?.EnablePrePackagedHls ?? true}
                                    />
                                }
                                label={globalize.translate('LabelEnablePrePackagedHls')}
                            />
                            <FormHelperText>
                                {globalize.translate('LabelEnablePrePackagedHlsHelp')}
                            </FormHelperText>
                        </FormGroup>

                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name='ForcePrePackagedHls'
                                        defaultChecked={hlsConfig?.ForcePrePackagedHls ?? true}
                                    />
                                }
                                label={globalize.translate('LabelForcePrePackagedHls')}
                            />
                            <FormHelperText>
                                {globalize.translate('LabelForcePrePackagedHlsHelp')}
                            </FormHelperText>
                        </FormGroup>

                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name='EnablePrePackagedHlsTranscodeFallback'
                                        defaultChecked={hlsConfig?.EnablePrePackagedHlsTranscodeFallback ?? false}
                                    />
                                }
                                label={globalize.translate('LabelEnablePrePackagedHlsTranscodeFallback')}
                            />
                            <FormHelperText>
                                {globalize.translate('LabelEnablePrePackagedHlsTranscodeFallbackHelp')}
                            </FormHelperText>
                        </FormGroup>

                        <Button
                            type='submit'
                            size='large'
                        >
                            {globalize.translate('Save')}
                        </Button>
                    </Stack>
                </Form>
            </Box>
        </Page>
    );
};

Component.displayName = 'StreamingPage';
