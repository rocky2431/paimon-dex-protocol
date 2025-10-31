'use client';

import { Box, Slider, TextField, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { MINT_CONFIG } from './constants';

interface QuantitySelectorProps {
  quantity: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Quantity Selector Component
 * Allows users to select NFT quantity (1-500) with slider and buttons
 */
export function QuantitySelector({ quantity, onChange, disabled = false }: QuantitySelectorProps) {
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    onChange(newValue as number);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= MINT_CONFIG.MIN_QUANTITY && value <= MINT_CONFIG.MAX_QUANTITY) {
      onChange(value);
    }
  };

  const handleDecrement = () => {
    if (quantity > MINT_CONFIG.MIN_QUANTITY) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < MINT_CONFIG.MAX_QUANTITY) {
      onChange(quantity + 1);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#D17A00', fontWeight: 700 }}>
        Select Quantity
      </Typography>

      {/* Slider */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Slider
          value={quantity}
          onChange={handleSliderChange}
          min={MINT_CONFIG.MIN_QUANTITY}
          max={MINT_CONFIG.MAX_QUANTITY}
          step={1}
          disabled={disabled}
          marks={[
            { value: 1, label: '1' },
            { value: 100, label: '100' },
            { value: 250, label: '250' },
            { value: 500, label: '500' },
          ]}
          sx={{
            color: '#FF8C00', // Warm orange
            '& .MuiSlider-thumb': {
              bgcolor: '#FF8C00',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 0 8px rgba(255, 140, 0, 0.16)',
              },
            },
            '& .MuiSlider-track': {
              bgcolor: '#FF8C00',
            },
            '& .MuiSlider-rail': {
              bgcolor: '#FFCC80',
            },
            '& .MuiSlider-mark': {
              bgcolor: '#FF8C00',
            },
            '& .MuiSlider-markLabel': {
              color: '#8B4000', // Warm brown
            },
          }}
        />
      </Box>

      {/* Input with +/- buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <IconButton
          onClick={handleDecrement}
          disabled={disabled || quantity <= MINT_CONFIG.MIN_QUANTITY}
          sx={{
            bgcolor: '#FF8C00',
            color: 'white',
            '&:hover': { bgcolor: '#FF7F00' },
            '&.Mui-disabled': { bgcolor: '#FFCC80', color: 'white' },
          }}
        >
          <RemoveIcon />
        </IconButton>

        <TextField
          value={quantity}
          onChange={handleInputChange}
          type="number"
          disabled={disabled}
          inputProps={{
            min: MINT_CONFIG.MIN_QUANTITY,
            max: MINT_CONFIG.MAX_QUANTITY,
            style: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' },
          }}
          sx={{
            width: '120px',
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#FF8C00' },
              '&:hover fieldset': { borderColor: '#FF7F00' },
              '&.Mui-focused fieldset': { borderColor: '#FF8C00' },
            },
            '& input': {
              color: '#8B4000',
            },
          }}
        />

        <IconButton
          onClick={handleIncrement}
          disabled={disabled || quantity >= MINT_CONFIG.MAX_QUANTITY}
          sx={{
            bgcolor: '#FF8C00',
            color: 'white',
            '&:hover': { bgcolor: '#FF7F00' },
            '&.Mui-disabled': { bgcolor: '#FFCC80', color: 'white' },
          }}
        >
          <AddIcon />
        </IconButton>
      </Box>

      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: '#A0522D' }}>
        Max {MINT_CONFIG.MAX_QUANTITY} NFTs per address
      </Typography>
    </Box>
  );
}
