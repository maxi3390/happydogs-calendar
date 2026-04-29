'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Edit2, Shield, Trash2, PawPrint } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { useFeatureFlag } from '@/lib/feature-flags';

export default function UIComponentsPage() {
  const { t } = useTranslation();
  const enabled = useFeatureFlag('ui_system');

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="ui-system-disabled">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('featureFlags.empty')}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">UI Components Library</h1>
          <p className="text-muted-foreground mt-2">
            This internal page contains all the base elements of the UI as reusable components. 
            Use these to maintain consistency across the application.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          
          {/* Section: Buttons */}
          <section>
            <h2 className="text-xl font-bold border-b border-border/50 pb-2 mb-6 text-primary">Buttons</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Variants</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-start gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sizes & Icons</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-start gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  
                  <Button variant="primary">
                    <PawPrint className="w-4 h-4" />
                    With Icon
                  </Button>

                  <Button variant="secondary" size="icon" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  
                  <Button variant="danger" size="icon" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section: Form Fields */}
          <section>
            <h2 className="text-xl font-bold border-b border-border/50 pb-2 mb-6 text-primary">Form Fields</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input label="Default Input" placeholder="Type here..." />
                  <Input label="Input with Error" error="This field is required" placeholder="Invalid input" />
                  <Input label="Disabled Input" disabled placeholder="Can't touch this" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Selects</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select 
                    label="Default Select" 
                    options={[
                      { value: 1, label: 'Option 1' },
                      { value: 2, label: 'Option 2' },
                    ]} 
                  />
                  <Select 
                    label="Select with Error" 
                    error="Please choose an option"
                    options={[
                      { value: '', label: 'Select...' },
                      { value: 'dog', label: 'Dog' },
                      { value: 'cat', label: 'Cat' }
                    ]} 
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section: Badges */}
          <section>
            <h2 className="text-xl font-bold border-b border-border/50 pb-2 mb-6 text-primary">Badges</h2>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-start gap-4 mt-6">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="outline">Outline</Badge>
              </CardContent>
            </Card>
          </section>

          {/* Section: Cards */}
          <section>
            <h2 className="text-xl font-bold border-b border-border/50 pb-2 mb-6 text-primary">Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Simple Example Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    This is the main content of the card. You can place any UI elements here, like text, images, or forms.
                  </p>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="primary">Confirm</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 mt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Compact Card layout</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Using just Card and CardContent with flexbox.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
