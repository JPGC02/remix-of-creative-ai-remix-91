import React, { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Settings2, Eye, EyeOff, ExternalLink, Check, Sparkles, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ApiKeyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  configuredKeys: string[];
  onKeysSaved: () => void;
}

interface WizardStep {
  id: string;
  title: string;
  keyName: string;
  label: string;
  description: string;
  placeholder: string;
  helpUrl: string;
  helpLabel: string;
  icon: string;
  optional?: boolean;
}

const STEPS: WizardStep[] = [
  {
    id: 'gemini',
    title: 'Google Gemini API Key',
    keyName: 'GEMINI_API_KEY',
    label: 'Google Gemini',
    description: 'Usada para geração de vídeos com Veo 3.1 e funcionalidades de IA do Google.',
    placeholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpLabel: 'aistudio.google.com',
    icon: '🎬',
  },
  {
    id: 'removebg',
    title: 'Remove.bg API Key',
    keyName: 'REMOVE_BG_API_KEY',
    label: 'Remove.bg',
    description: 'Usada para remoção automática de fundo de imagens.',
    placeholder: '',
    helpUrl: 'https://www.remove.bg/dashboard#api-key',
    helpLabel: 'remove.bg',
    icon: '✂️',
    optional: true,
  },
];

const FINISH_STEP_INDEX = STEPS.length;

// Animations
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.9,
    filter: 'blur(10px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.9,
    filter: 'blur(10px)',
  }),
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 30 },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Animated checkmark
const AnimatedCheckmark = () => (
  <motion.svg viewBox="0 0 24 24" className="w-4 h-4" initial="hidden" animate="visible">
    <motion.path
      d="M5 13l4 4L19 7"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
          pathLength: 1,
          opacity: 1,
          transition: { pathLength: { duration: 0.4, ease: 'easeOut' }, opacity: { duration: 0.1 } },
        },
      }}
    />
  </motion.svg>
);

const StepCircle = ({
  index,
  activeStep,
  totalSteps,
  isOptional,
  isConfigured,
  onClick,
}: {
  index: number;
  activeStep: number;
  totalSteps: number;
  isOptional?: boolean;
  isConfigured?: boolean;
  onClick: () => void;
}) => {
  const isCompleted = index < activeStep || isConfigured;
  const isActive = index === activeStep;
  const isFinish = index === totalSteps;

  return (
    <motion.button
      onClick={onClick}
      className="relative z-10 flex-shrink-0"
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/30"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ margin: '-4px' }}
        />
      )}
      <motion.div
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-300',
          isCompleted
            ? 'bg-gradient-to-br from-primary to-primary/80 border-primary text-primary-foreground shadow-lg shadow-primary/40'
            : isActive
            ? 'border-primary text-primary bg-primary/10 shadow-lg shadow-primary/20'
            : isOptional
            ? 'border-border text-muted-foreground bg-muted/50 border-dashed'
            : 'border-border text-muted-foreground bg-muted/50'
        )}
        animate={
          isActive
            ? {
                boxShadow: [
                  '0 0 0px hsl(var(--primary) / 0.4)',
                  '0 0 25px hsl(var(--primary) / 0.6)',
                  '0 0 0px hsl(var(--primary) / 0.4)',
                ],
              }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {isCompleted ? (
          <AnimatedCheckmark />
        ) : isFinish ? (
          <Sparkles className="w-3.5 h-3.5" />
        ) : (
          <motion.span
            key={index}
            className="text-xs font-semibold"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {index + 1}
          </motion.span>
        )}
      </motion.div>
    </motion.button>
  );
};

const ConnectingLine = ({ isCompleted }: { isCompleted: boolean }) => (
  <div className="relative flex-1 h-0.5 mx-1 bg-border rounded-full overflow-hidden self-center min-w-[12px]">
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: isCompleted ? 1 : 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ transformOrigin: 'left' }}
    />
  </div>
);

// Step content for API key input
function StepApiKey({
  step,
  value,
  onChange,
  isConfigured,
}: {
  step: WizardStep;
  value: string;
  onChange: (v: string) => void;
  isConfigured: boolean;
}) {
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl mb-3 block">{step.icon}</span>
        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{step.description}</p>
        {step.optional && (
          <span className="inline-block mt-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Opcional
          </span>
        )}
      </div>

      {isConfigured && !value && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary/10 border border-primary/20">
          <Check className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">Chave já configurada</span>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-3">
        <div className="relative">
          <Input
            type={showValue ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isConfigured ? 'Deixe vazio para manter a atual...' : step.placeholder || 'Cole sua API key aqui...'}
            className="pr-10 bg-background border-border text-foreground text-sm font-mono rounded-lg"
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <a
          href={step.helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Obter key em {step.helpLabel}
        </a>
      </div>
    </div>
  );
}

// Finish step
function StepFinish({
  configuredKeys,
  onComplete,
}: {
  configuredKeys: string[];
  onComplete: () => void;
}) {
  const configured = STEPS.filter((s) => configuredKeys.includes(s.keyName));
  const pending = STEPS.filter((s) => !configuredKeys.includes(s.keyName) && !s.optional);

  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
      >
        <Sparkles className="w-12 h-12 text-primary mx-auto" />
      </motion.div>
      <div>
        <h3 className="text-xl font-semibold text-foreground">Tudo pronto!</h3>
        <p className="text-sm text-muted-foreground mt-2">
          {pending.length === 0
            ? 'Todas as integrações estão configuradas. Você pode começar a criar!'
            : 'Você pode voltar a qualquer momento em Configurações para completar as integrações.'}
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-2">
        {STEPS.map((step) => {
          const active = configuredKeys.includes(step.keyName);
          return (
            <div
              key={step.keyName}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left',
                active ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
              )}
            >
              <span className="text-lg">{step.icon}</span>
              <span className={cn('text-sm flex-1', active ? 'text-foreground' : 'text-muted-foreground')}>
                {step.label}
              </span>
              {active ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {step.optional ? 'Opcional' : 'Pendente'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={onComplete}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 px-8"
        >
          <Sparkles className="w-4 h-4" />
          Começar a criar
        </Button>
      </motion.div>
    </div>
  );
}

export const ApiKeyWizard: React.FC<ApiKeyWizardProps> = ({ isOpen, onClose, configuredKeys, onKeysSaved }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});

  const totalSteps = STEPS.length + 1; // +1 for finish step
  const allStepIds = [...STEPS.map((_, i) => i), FINISH_STEP_INDEX];

  const handleSaveKey = useCallback(
    async (keyName: string, value: string) => {
      if (!value.trim()) return true; // skip if empty (keep existing)
      setIsSaving(true);
      try {
        const { data, error } = await supabase.functions.invoke('manage-api-keys', {
          method: 'POST',
          body: { action: 'upsert', keyName, keyValue: value.trim() },
        });
        if (error || data?.error) {
          toast.error(data?.error || 'Erro ao salvar a chave');
          return false;
        }
        toast.success(`${keyName.replace(/_/g, ' ')} salva!`);
        onKeysSaved();
        return true;
      } catch {
        toast.error('Erro ao salvar');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [onKeysSaved]
  );

  const handleNext = async () => {
    if (activeStep < STEPS.length) {
      const step = STEPS[activeStep];
      const value = keyValues[step.keyName] || '';
      if (value.trim()) {
        const ok = await handleSaveKey(step.keyName, value);
        if (!ok) return;
      }
    }
    if (activeStep < FINISH_STEP_INDEX) {
      setDirection(1);
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setDirection(-1);
      setActiveStep(activeStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setDirection(index > activeStep ? 1 : -1);
    setActiveStep(index);
  };

  const handleComplete = () => {
    localStorage.setItem('apikey-wizard-seen', 'true');
    onClose();
  };

  const progressPercentage = ((activeStep + 1) / totalSteps) * 100;

  const currentStepData = activeStep < STEPS.length ? STEPS[activeStep] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 25 }}
            className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 pt-7 border-b border-border">
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-2 rounded-lg bg-primary/10 border border-primary/20"
                  animate={{
                    boxShadow: [
                      '0 0 0px hsl(var(--primary) / 0.3)',
                      '0 0 15px hsl(var(--primary) / 0.4)',
                      '0 0 0px hsl(var(--primary) / 0.3)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Settings2 className="w-5 h-5 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Configuração Inicial</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-muted-foreground">Passo</span>
                    <motion.span
                      key={activeStep}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-sm font-semibold text-primary"
                    >
                      {activeStep + 1}
                    </motion.span>
                    <span className="text-sm text-muted-foreground">de {totalSteps}</span>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Step indicators */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-center max-w-lg mx-auto">
                {allStepIds.map((stepIdx, i) => (
                  <React.Fragment key={stepIdx}>
                    <StepCircle
                      index={stepIdx}
                      activeStep={activeStep}
                      totalSteps={FINISH_STEP_INDEX}
                      isOptional={stepIdx < STEPS.length ? STEPS[stepIdx].optional : false}
                      isConfigured={
                        stepIdx < STEPS.length ? configuredKeys.includes(STEPS[stepIdx].keyName) : false
                      }
                      onClick={() => handleStepClick(stepIdx)}
                    />
                    {i < allStepIds.length - 1 && <ConnectingLine isCompleted={stepIdx < activeStep} />}
                  </React.Fragment>
                ))}
              </div>
              <div className="text-center mt-3">
                <motion.span
                  key={activeStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium text-primary"
                >
                  {currentStepData?.title || 'Finalizar'}
                  {currentStepData?.optional && (
                    <span className="text-muted-foreground font-normal ml-2">(opcional)</span>
                  )}
                </motion.span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 overflow-x-hidden min-h-[300px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={activeStep}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 200, damping: 25 },
                    opacity: { duration: 0.3 },
                    scale: { duration: 0.3 },
                    filter: { duration: 0.3 },
                  }}
                >
                  {activeStep < STEPS.length ? (
                    <StepApiKey
                      step={STEPS[activeStep]}
                      value={keyValues[STEPS[activeStep].keyName] || ''}
                      onChange={(v) =>
                        setKeyValues((prev) => ({ ...prev, [STEPS[activeStep].keyName]: v }))
                      }
                      isConfigured={configuredKeys.includes(STEPS[activeStep].keyName)}
                    />
                  ) : (
                    <StepFinish configuredKeys={configuredKeys} onComplete={handleComplete} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            {activeStep < FINISH_STEP_INDEX && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between p-6 border-t border-border bg-card"
              >
                <motion.div whileHover={{ scale: 1.02, x: -3 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    onClick={handlePrev}
                    disabled={activeStep === 0}
                    className="gap-2 group"
                  >
                    <motion.div
                      animate={{ x: [0, -3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <ChevronLeft className="w-4 h-4 group-hover:text-primary transition-colors" />
                    </motion.div>
                    Anterior
                  </Button>
                </motion.div>

                <AnimatePresence>
                  {isSaving && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Salvando...</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  {currentStepData?.optional && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setDirection(1);
                          setActiveStep(activeStep + 1);
                        }}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                      >
                        Pular
                        <SkipForward className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  )}
                  <motion.div whileHover={{ scale: 1.02, x: 3 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleNext}
                      disabled={isSaving}
                      className="gap-2 group bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                    >
                      Próximo
                      <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                      >
                        <ChevronRight className="w-4 h-4 group-hover:text-primary-foreground transition-colors" />
                      </motion.div>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
