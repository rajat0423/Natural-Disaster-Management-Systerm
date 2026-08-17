"""
============================================================
Disaster Management System — Loss Functions
============================================================

Implements:
  1. Standard Multi-Class Cross-Entropy Loss
  2. Combined Loss (Cross-Entropy + Multi-class Dice Loss)
"""

import torch
import torch.nn as nn
import segmentation_models_pytorch as smp


class CombinedLoss(nn.Module):
    def __init__(self, loss_type="ce_dice", num_classes=5, ce_weight=0.5, dice_weight=0.5):
        super().__init__()
        self.loss_type = loss_type
        self.ce_weight = ce_weight
        self.dice_weight = dice_weight
        
        self.ce_loss = nn.CrossEntropyLoss()
        self.dice_loss = smp.losses.DiceLoss(mode="multiclass", from_logits=True)

    def forward(self, logits, targets):
        if self.loss_type == "ce_only":
            return self.ce_loss(logits, targets)
        elif self.loss_type == "dice_only":
            return self.dice_loss(logits, targets)
        else:
            # Combined CE + Dice Loss
            ce = self.ce_loss(logits, targets)
            dice = self.dice_loss(logits, targets)
            return self.ce_weight * ce + self.dice_weight * dice
