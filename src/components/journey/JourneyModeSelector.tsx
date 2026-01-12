import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket, Shield, Check, X } from 'lucide-react';
import { JourneyMode } from '@/contexts/JourneyContext';

interface JourneyModeSelectorProps {
  onSelectMode: (mode: JourneyMode) => void;
  isLoading?: boolean;
}

const JourneyModeSelector: React.FC<JourneyModeSelectorProps> = ({ onSelectMode, isLoading }) => {
  const modes = [
    {
      id: 'startup' as JourneyMode,
      title: 'Startup Mode',
      icon: Rocket,
      description: 'Streamlined experience focused on core GRC essentials',
      color: 'from-blue-500 to-cyan-500',
      features: [
        { text: 'Core risk management', included: true },
        { text: 'Asset inventory', included: true },
        { text: 'Control frameworks', included: true },
        { text: 'Vendor management', included: true },
        { text: 'Security Operations', included: false },
        { text: 'Advanced threat modeling', included: false },
      ],
      recommended: true,
    },
    {
      id: 'advanced' as JourneyMode,
      title: 'Advanced Mode',
      icon: Shield,
      description: 'Full-featured GRC platform with all capabilities enabled',
      color: 'from-primary to-accent',
      features: [
        { text: 'Core risk management', included: true },
        { text: 'Asset inventory', included: true },
        { text: 'Control frameworks', included: true },
        { text: 'Vendor management', included: true },
        { text: 'Security Operations', included: true },
        { text: 'Advanced threat modeling', included: true },
      ],
      recommended: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold">Choose Your Experience</h2>
        <p className="text-muted-foreground">
          Select the mode that best fits your organization's needs. You can change this later.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {modes.map((mode) => (
          <Card
            key={mode.id}
            className={`relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
              mode.recommended ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => !isLoading && onSelectMode(mode.id)}
          >
            {mode.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                Recommended for new users
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <div className={`mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4`}>
                <mode.icon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">{mode.title}</CardTitle>
              <CardDescription>{mode.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {mode.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={feature.included ? '' : 'text-muted-foreground line-through'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={mode.recommended ? 'default' : 'outline'}
                disabled={isLoading}
              >
                {isLoading ? 'Setting up...' : `Choose ${mode.title}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default JourneyModeSelector;
