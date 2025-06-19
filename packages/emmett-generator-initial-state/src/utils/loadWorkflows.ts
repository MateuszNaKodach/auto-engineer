import fg from 'fast-glob';
import path from 'path';
import type { EventStore, CommandSender } from '@event-driven-io/emmett';

export type WorkflowReactorSetup = {
    setup: (eventStore: EventStore, commandSender: CommandSender) => Promise<any>;
};

export async function loadWorkflows(): Promise<WorkflowReactorSetup[]> {
    const files = await fg('src/domain/slices/**/reactor.{ts,js}', {
        absolute: true,
    });

    console.log('🔍 Found workflow files:', files);

    const modules = await Promise.all(
        files.map(async (file) => {
            try {
                const mod = await import(pathToFileUrl(file).href);
                console.log('📦 Loaded module from', file, ':', Object.keys(mod));

                // Return the module itself if it has setup, otherwise null
                return mod.setup ? mod : null;
            } catch (error) {
                console.error('❌ Failed to import', file, ':', error);
                return null;
            }
        })
    );

    console.log('📋 All modules:', modules);

    // Filter out null modules and return them directly (they already have .setup)
    const validModules = modules.filter(Boolean);

    console.log('⚙️ Found setups:', validModules.length);

    return validModules as WorkflowReactorSetup[];
}

export async function setupWorkflowReactors(
    workflows: WorkflowReactorSetup[],
    eventStore: EventStore,
    commandSender: CommandSender
): Promise<any[]> {
    console.log('🚀 Setting up', workflows.length, 'workflow reactors');

    return Promise.all(
        workflows.map((workflow, index) => {
            console.log('⚙️ Setting up workflow', index, typeof workflow.setup);
            return workflow.setup(eventStore, commandSender);
        })
    );
}

function pathToFileUrl(filePath: string): URL {
    const resolved = path.resolve(filePath);
    return new URL(`file://${resolved}`);
}