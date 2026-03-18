export {};

class MockSlashCommandStringOption {
    public config: Record<string, unknown> = {};

    setName(name: string) {
        this.config.name = name;
        return this;
    }

    setDescription(description: string) {
        this.config.description = description;
        return this;
    }

    setRequired(required: boolean) {
        this.config.required = required;
        return this;
    }

    setAutocomplete(autocomplete: boolean) {
        this.config.autocomplete = autocomplete;
        return this;
    }
}

class MockSlashCommandBuilder {
    public name?: string;
    public description?: string;
    public options: MockSlashCommandStringOption[] = [];

    setName(name: string) {
        this.name = name;
        return this;
    }

    setDescription(description: string) {
        this.description = description;
        return this;
    }

    addStringOption(
        configure: (option: MockSlashCommandStringOption) => unknown
    ) {
        const option = new MockSlashCommandStringOption();
        configure(option);
        this.options.push(option);
        return this;
    }
}

jest.mock('discord.js', () => ({
    SlashCommandBuilder: MockSlashCommandBuilder,
}));

const {
    pingCommand,
} = require('../packages/diana-discord/src/discord/coreCommands');

describe('pingCommand', () => {
    describe('data', () => {
        it('has the correct name', () => {
            expect(pingCommand.data.name).toBe('ping');
        });

        it('has a non-empty description', () => {
            expect(typeof pingCommand.data.description).toBe('string');
            expect(pingCommand.data.description.length).toBeGreaterThan(0);
        });

        it('description mentions pong', () => {
            expect(pingCommand.data.description.toLowerCase()).toContain(
                'pong'
            );
        });

        it('has an optional target string option', () => {
            const targetOption = pingCommand.data.options.find(
                (o: any) => o.config.name === 'target'
            );
            expect(targetOption).toBeDefined();
            expect(targetOption.config.required).toBe(false);
        });
    });

    describe('execute', () => {
        it('replies with "Diana said pong." when no target is provided', async () => {
            const interaction = {
                options: {
                    getString: jest.fn().mockReturnValue(null),
                },
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await pingCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledWith('Diana said pong.');
        });

        it('replies with a ping message including the target when target is provided', async () => {
            const interaction = {
                options: {
                    getString: jest.fn().mockReturnValue('Faker'),
                },
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await pingCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledWith(
                expect.stringContaining('Faker')
            );
        });

        it('does not call reply more than once per invocation', async () => {
            const interaction = {
                options: {
                    getString: jest.fn().mockReturnValue(null),
                },
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await pingCommand.execute(interaction as any);

            expect(interaction.reply).toHaveBeenCalledTimes(1);
        });

        it('calls getString with "target" to check for optional target', async () => {
            const interaction = {
                options: {
                    getString: jest.fn().mockReturnValue(null),
                },
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await pingCommand.execute(interaction as any);

            expect(interaction.options.getString).toHaveBeenCalledWith(
                'target'
            );
        });
    });
});
